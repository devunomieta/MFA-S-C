import { supabase } from "./supabase";

interface EmailPayload {
  to: string | string[];
  subject?: string;
  template?: string;
  data: any;
}

export const emailService = {
  /**
   * Send an email notification via Supabase Edge Function.
   */
  async sendEmail(payload: EmailPayload) {
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: payload,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("Email Service Error:", err.message);
      return { success: false, error: err.message };
    }
  },

  async sendTransactionUpdate(email: string, type: string, amount: number, status: string) {
    return this.sendEmail({
      to: email,
      subject: `MTF Transaction Status: ${status.toUpperCase()}`,
      template: "transaction_update",
      data: { type, amount, status, date: new Date().toISOString() },
    });
  },

  async sendLoanUpdate(email: string, amount: number, status: string) {
    return this.sendEmail({
      to: email,
      subject: `Update on your MTF Loan Application`,
      template: "loan_update",
      data: { amount, status, date: new Date().toISOString() },
    });
  },

  async sendPlanJoined(email: string, planName: string) {
    return this.sendEmail({
      to: email,
      subject: `Welcome to the ${planName} Plan!`,
      template: "plan_joined",
      data: { planName, date: new Date().toISOString() },
    });
  },
};
