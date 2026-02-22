import { supabase } from "./supabase";

interface EmailPayload {
    to: string;
    subject: string;
    template: string;
    data: any;
}

export const emailService = {
    /**
     * Send an email notification.
     * In a production environment, this would call a Supabase Edge Function 
     * or a secure API that integrates with Resend, SendGrid, etc.
     */
    async sendEmail(payload: EmailPayload) {
        console.log(`[Email Service] Sending ${payload.template} to ${payload.to}`, payload.data);

        // Example Edge Function call:
        /*
        const { error } = await supabase.functions.invoke('send-email', {
            body: payload
        });
        if (error) throw error;
        */

        return { success: true };
    },

    async sendTransactionUpdate(email: string, type: string, amount: number, status: string) {
        return this.sendEmail({
            to: email,
            subject: `MTF Transaction Status: ${status.toUpperCase()}`,
            template: 'transaction_update',
            data: { type, amount, status, date: new Date().toISOString() }
        });
    },

    async sendLoanUpdate(email: string, amount: number, status: string) {
        return this.sendEmail({
            to: email,
            subject: `Update on your MTF Loan Application`,
            template: 'loan_update',
            data: { amount, status, date: new Date().toISOString() }
        });
    },

    async sendPlanJoined(email: string, planName: string) {
        return this.sendEmail({
            to: email,
            subject: `Welcome to the ${planName} Plan!`,
            template: 'plan_joined',
            data: { planName, date: new Date().toISOString() }
        });
    }
};
