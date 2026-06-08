import { emailService } from "./email";
import { supabase } from "./supabase";

export interface AlertPayload {
  userId: string;
  email: string;
  type: "transaction" | "loan" | "plan" | "help" | "profile" | "reminder";
  title: string;
  message: string;
  emailTemplate?: string;
  emailData?: any;
}

export const notificationDispatcher = {
  /**
   * Dispatches an alert across multiple channels:
   * 1. In-App Notification (Database)
   * 2. Email (via Edge Function)
   * 3. WhatsApp (automatically mirrored by the send-email Edge Function if phone number exists)
   */
  async sendAlert(payload: AlertPayload) {
    const { userId, email, type, title, message, emailTemplate, emailData } = payload;

    try {
      // 1. Create In-App Notification
      const { error: dbError } = await supabase.from("notifications").insert({
        user_id: userId,
        type: type,
        title: title,
        message: message,
        data: emailData || {},
        is_read: false,
      });

      if (dbError) {
        console.error("Failed to save in-app notification:", dbError.message);
      }

      // 2. Dispatch Email (which mirrors to WhatsApp)
      if (emailTemplate) {
        await emailService.sendEmail({
          to: email,
          subject: title,
          template: emailTemplate,
          data: { ...emailData, message },
        });
      } else {
        await emailService.sendEmail({
          to: email,
          subject: title,
          data: { message },
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error("Notification Dispatcher Error:", error.message);
      return { success: false, error: error.message };
    }
  },
};
