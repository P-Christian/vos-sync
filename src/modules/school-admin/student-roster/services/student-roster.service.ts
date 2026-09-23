import { StudentRosterFilter, VsSchoolStudent } from '../types/student-roster.types';
import { createStudentSchema, bulkStudentSchema, CreateStudentInput, BulkStudentInput } from '../types/student-roster.schema';
import * as repo from './student-roster.repo';

export async function getStudentRoster(filter: StudentRosterFilter) {
  if (!filter.school_id) {
    throw new Error('School ID is required');
  }
  return await repo.fetchStudentsRepo(filter);
}

export async function addSingleStudent(schoolId: number, createdByUserId: number, input: CreateStudentInput): Promise<VsSchoolStudent> {
  const validated = createStudentSchema.parse(input);
  
  const payload: Partial<VsSchoolStudent> = {
    school_id: schoolId,
    student_number: validated.student_number || null,
    first_name: validated.first_name,
    middle_name: validated.middle_name || null,
    last_name: validated.last_name,
    email: validated.email.toLowerCase(),
    school_course_id: validated.school_course_id || null,
    school_year: validated.school_year,
    gpa: validated.gpa ?? null,
    invitation_status: 'Not Sent',
    created_by: createdByUserId,
  };

  return await repo.createStudentRepo(payload);
}

export async function addBulkStudents(schoolId: number, createdByUserId: number, inputList: BulkStudentInput): Promise<VsSchoolStudent[]> {
  const validatedList = bulkStudentSchema.parse(inputList);
  
  const payloadList: Partial<VsSchoolStudent>[] = validatedList.map((item) => ({
    school_id: schoolId,
    student_number: item.student_number || null,
    first_name: item.first_name,
    middle_name: item.middle_name || null,
    last_name: item.last_name,
    email: item.email.toLowerCase(),
    school_course_id: item.school_course_id || null,
    school_year: item.school_year,
    gpa: item.gpa ?? null,
    invitation_status: 'Not Sent',
    created_by: createdByUserId,
  }));

  return await repo.bulkCreateStudentsRepo(payloadList);
}

export async function removeStudentFromRoster(studentId: number): Promise<boolean> {
  return await repo.deleteStudentRepo(studentId);
}

export async function inviteStudentService(
  schoolId: number,
  studentId: number,
  originUrl: string
): Promise<{ token: string; invitation_url: string; expires_at: string; student: VsSchoolStudent }> {
  const student = await repo.getStudentByIdRepo(studentId);
  if (!student) {
    throw new Error('Student not found.');
  }

  if (Number(student.school_id) !== Number(schoolId)) {
    throw new Error('Unauthorized. Student does not belong to this school.');
  }

  if (student.invitation_status === 'Registered') {
    throw new Error('Student is already registered as a freelancer.');
  }

  // Check for active unused token or create new
  let tokenRecord = await repo.findActiveStudentInvitationRepo(studentId, schoolId);

  if (!tokenRecord) {
    const crypto = await import('crypto');
    const token = crypto.randomBytes(24).toString('hex');
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 30);
    const expiresAt = expiresDate.toISOString().slice(0, 19).replace('T', ' ');

    tokenRecord = await repo.createStudentInvitationRepo(studentId, schoolId, token, expiresAt);

    // Update student status to Invited
    await repo.updateStudentRepo(studentId, {
      invitation_status: 'Invited',
      invited_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  }

  const cleanOrigin = originUrl.replace(/\/$/, '');
  const invitationUrl = `${cleanOrigin}/student-register?token=${tokenRecord.token}`;

  // Dispatch Invitation Email
  if (student.email) {
    try {
      const { sendMail } = await import('@/lib/mail');
      await sendMail({
        to: student.email,
        subject: `🎓 You're invited to join VOS Sync Freelancer Network!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #6366f1; margin: 0; font-size: 24px; font-weight: 800;">VOS Sync</h1>
              <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Student Career & Freelance Network</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #0f172a; margin: 0 0 10px; font-size: 18px;">Hello ${student.first_name}!</h2>
              <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.5;">
                Your institution has registered you on VOS Sync. Activate your student freelancer account to showcase your skills, build your professional portfolio, and receive verified job recommendations and referrals from your school administrators.
              </p>
            </div>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${invitationUrl}" style="background-color: #6366f1; color: #ffffff; padding: 13px 32px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);">
                Activate Student Account
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0; line-height: 1.4;">
              This invitation link is unique to you and valid for 30 days.<br/>
              If the button does not work, copy and paste this URL into your browser:<br/>
              <span style="color: #6366f1; word-break: break-all;">${invitationUrl}</span>
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn(`[student-roster] Failed to send invitation email to ${student.email}:`, mailErr);
    }
  }

  return {
    token: tokenRecord.token,
    invitation_url: invitationUrl,
    expires_at: tokenRecord.expires_at,
    student,
  };
}
