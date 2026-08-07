"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useConversations } from "@/modules/freelancer/freelancer-messaging/hooks/useConversations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export function RecentMessagesPreview() {
    const { conversations, loading, loadConversations } = useConversations();

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Sort by unread first, then by last message time, and take top 3
    const recentConversations = [...conversations]
        .sort((a, b) => {
            const unreadA = a.unread_count || 0;
            const unreadB = b.unread_count || 0;
            if (unreadA > 0 && unreadB === 0) return -1;
            if (unreadB > 0 && unreadA === 0) return 1;
            
            const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            const validTimeA = isNaN(timeA) ? 0 : timeA;
            const validTimeB = isNaN(timeB) ? 0 : timeB;
            return validTimeB - validTimeA;
        })
        .slice(0, 3);

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    if (loading) {
        return (
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="text-lg">Recent Messages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-4 p-2 animate-pulse">
                            <div className="h-10 w-10 rounded-full bg-muted/20"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-1/2"></div>
                                <div className="h-3 bg-muted rounded w-3/4"></div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-lg">Recent Messages</CardTitle>
                    <CardDescription>Your latest conversations</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                    <Link href="/vos-sync/freelancer/messaging">
                        View All <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                {recentConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                        <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <h3 className="font-medium text-foreground">No messages yet</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                            When employers contact you, their messages will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {recentConversations.map((conv) => (
                            <Link 
                                key={conv.conversation_id} 
                                href={`/vos-sync/freelancer/messaging?conversationId=${conv.conversation_id}`}
                                className={`flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                                    (conv.unread_count || 0) > 0 ? "bg-primary/5 border-l-2 border-primary" : ""
                                }`}
                            >
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={conv.other_party_avatar || undefined} alt={conv.other_party_name} />
                                    <AvatarFallback>{getInitials(conv.other_party_name)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className={`text-sm truncate ${(conv.unread_count || 0) > 0 ? "font-semibold" : "font-medium"}`}>
                                            {conv.other_party_name}
                                        </h4>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 flex items-center">
                                            {conv.last_message_at && !isNaN(new Date(conv.last_message_at).getTime()) ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, includeSeconds: false }).replace('about ', '') : ""}
                                        </span>
                                    </div>
                                    <p className={`text-xs truncate mt-0.5 ${(conv.unread_count || 0) > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                        {conv.last_message_preview || "Sent a message"}
                                    </p>
                                </div>
                                {(conv.unread_count || 0) > 0 && (
                                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                )}
                            </Link>
                        ))}
                    </div>
                )}

                {recentConversations.length > 0 && (
                    <Button variant="ghost" size="sm" asChild className="w-full mt-4 sm:hidden">
                        <Link href="/vos-sync/freelancer/messaging">
                            View All Messages
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
