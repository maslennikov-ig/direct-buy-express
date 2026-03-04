import { Context, type SessionFlavor } from "grammy";
import { type Conversation, type ConversationFlavor } from "@grammyjs/conversations";

export type MyContext = Context & SessionFlavor<any> & ConversationFlavor<Context>;
export type MyConversation = Conversation<MyContext, MyContext>;
