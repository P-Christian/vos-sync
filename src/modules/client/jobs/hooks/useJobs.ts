"use client";

import { useState, useCallback } from "react";
import { JobPosting, JobFormData, JobStatus } from "../types";

const EMPTY_FORM: JobFormData = {
  job_title: "",
  job_description: "",
  job_requirements: "",
  job_type: "",
  job_location: "",
  job_department: "",
  salary_min: "",
  salary_max: "",
  salary_negotiable: false,
  experience_level: "",
  status: "DRAFT",
};


interface JobsResponse {
  jobs: JobPosting[];
}


interface JobResponse {
  job?: JobPosting;
  error?: string;
}


export function useJobs() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [filterStatus, setFilterStatus] =
    useState<JobStatus | "ALL">("ALL");


  const fetchJobs = useCallback(
    async (status?: JobStatus | "ALL") => {
      setLoading(true);
      setError("");

      try {
        const query =
          status && status !== "ALL"
            ? `?status=${status}`
            : "";


        const res = await fetch(
          `/api/client/jobs${query}`
        );


        const json: JobsResponse & {
          error?: string;
        } = await res.json();


        if (!res.ok) {
          throw new Error(
            json.error ??
            "Failed to load jobs."
          );
        }


        setJobs(json.jobs ?? []);

      } catch (err: unknown) {

        setError(
          err instanceof Error
            ? err.message
            : "An error occurred."
        );

      } finally {
        setLoading(false);
      }

    },
    []
  );



  const normalizeJobPayload = (
    formData: JobFormData
  ) => ({
    ...formData,

    salary_min:
      formData.salary_min
        ? Number(formData.salary_min)
        : null,

    salary_max:
      formData.salary_max
        ? Number(formData.salary_max)
        : null,
  });



  const createJob = useCallback(
    async (
      formData: JobFormData
    ) => {

      setSaving(true);
      setError("");
      setSuccessMessage("");

      try {

        const res = await fetch(
          "/api/client/jobs",
          {
            method: "POST",
            headers:{
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              normalizeJobPayload(formData)
            ),
          }
        );


        const json: JobResponse =
          await res.json();


        if (!res.ok) {
          throw new Error(
            json.error ??
            "Failed to create job."
          );
        }


        if (json.job) {
          setJobs(prev => [
            json.job!,
            ...prev,
          ]);
        }


        setSuccessMessage(
          "Job posting created successfully."
        );


        return true;


      } catch(err:unknown){

        setError(
          err instanceof Error
            ? err.message
            : "An error occurred."
        );

        return false;


      } finally {

        setSaving(false);

      }

    },
    []
  );



  const updateJob = useCallback(
    async (
      jobId:number,
      formData:JobFormData
    )=>{

      setSaving(true);
      setError("");
      setSuccessMessage("");


      try{

        const res = await fetch(
          `/api/client/jobs/${jobId}`,
          {
            method:"PATCH",
            headers:{
              "Content-Type":
                "application/json",
            },
            body:JSON.stringify(
              normalizeJobPayload(formData)
            ),
          }
        );


        const json:JobResponse =
          await res.json();



        if(!res.ok){
          throw new Error(
            json.error ??
            "Failed to update job."
          );
        }



        if(json.job){

          setJobs(prev =>
            prev.map(job =>
              job.job_id === jobId
                ? {
                    ...job,
                    ...json.job,
                  }
                : job
            )
          );

        }



        setSuccessMessage(
          "Job posting updated successfully."
        );


        return true;



      }catch(err:unknown){

        setError(
          err instanceof Error
            ? err.message
            : "An error occurred."
        );

        return false;


      }finally{

        setSaving(false);

      }


    },
    []
  );



  const changeJobStatus = useCallback(
    async (
      jobId:number,
      newStatus:JobStatus
    )=>{

      try{

        const res = await fetch(
          `/api/client/jobs/${jobId}`,
          {
            method:"PATCH",
            headers:{
              "Content-Type":
                "application/json",
            },
            body:JSON.stringify({
              status:newStatus,
            }),
          }
        );


        const json = await res.json();


        if(!res.ok){
          throw new Error(
            json.error ??
            "Failed to update status."
          );
        }


        setJobs(prev =>
          prev.map(job =>
            job.job_id === jobId
              ? {
                  ...job,
                  status:newStatus,
                }
              : job
          )
        );


      }catch(err:unknown){

        setError(
          err instanceof Error
            ? err.message
            : "An error occurred."
        );

      }

    },
    []
  );



  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };


  return {
    jobs,
    loading,
    saving,

    error,
    successMessage,

    filterStatus,
    setFilterStatus,

    fetchJobs,
    createJob,
    updateJob,
    changeJobStatus,

    EMPTY_FORM,

    clearMessages,
  };
}