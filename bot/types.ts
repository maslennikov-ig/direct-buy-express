import { Context, type SessionFlavor } from "grammy";
import { type MenuFlavor } from "@grammyjs/menu";
import { type Conversation, type ConversationFlavor } from "@grammyjs/conversations";

export interface SessionData {
    role?: "OWNER" | "BROKER" | "INVESTOR" | "MANAGER";
    activeLotId?: string;
    step?: string;
}

export type MyContext = Context
    & SessionFlavor<SessionData>
    & ConversationFlavor<Context>
    & MenuFlavor;

export type MyConversation = Conversation<MyContext, MyContext>;
