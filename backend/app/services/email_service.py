import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from app.core.config import settings

class EmailService:
    @staticmethod
    def send_welcome_account_created_async(user_email: str, user_name: str, role: str, department: str):
        """
        Sends a welcome & access confirmation email notification when a new account is registered.
        Executes asynchronously in a background thread.
        """
        def send():
            try:
                subject = "🎉 Welcome to CampusInsight AI - Account Registration & Access Confirmation"
                body = f"""
Hello {user_name},

Welcome to CampusInsight AI! Your institutional user account has been successfully registered.

Account Details:
--------------------------------------------------
Registered Email : {user_email}
Assigned Role    : {role}
Department       : {department}
System Access    : NAAC Accreditation Criterion 1 (Curricular Aspects)
Timestamp        : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
--------------------------------------------------

You can now log in to access your institutional dashboard, upload Criterion 1 evidence documents, and view AI-generated compliance analytics.

If you did not request this account or need administrative assistance, please contact your System Administrator immediately.

Best regards,
CampusInsight AI Administration Team
NAAC Criterion 1 Portal
"""
                EmailService._send_raw_email(user_email, subject, body)
            except Exception as e:
                print(f"[EmailService Welcome] Logged welcome alert for {user_email}: {e}")

        threading.Thread(target=send, daemon=True).start()

    @staticmethod
    def send_login_notification_async(user_email: str, user_name: str, role: str, department: str):
        """
        Sends an email notification to the user's Gmail address upon successful login.
        Executes in a background thread to prevent API response delays.
        """
        def send():
            try:
                subject = "🔒 CampusInsight AI - Security Login Alert"
                body = f"""
Hello {user_name},

A successful login was registered for your CampusInsight AI account.

Account Email: {user_email}
Assigned Role: {role}
Department: {department}
Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

If this was you, no further action is required.
If you did not perform this login, please contact your System Administrator immediately.

Best regards,
CampusInsight AI Security Team
NAAC Criterion 1 Portal
"""
                EmailService._send_raw_email(user_email, subject, body)
            except Exception as e:
                print(f"[EmailService Notification] Logged alert for {user_email}: {e}")

        threading.Thread(target=send, daemon=True).start()

    @staticmethod
    def send_verification_otp_async(user_email: str, user_name: str, otp_code: str):
        """
        Sends a 6-digit Security Verification Code to the user's Gmail address.
        """
        def send():
            try:
                subject = "CampusInsight AI - Security Verification Code"
                body = f"""
Hello {user_name},

Your security verification code for logging in to CampusInsight AI is:

------------------------------------
           {otp_code}
------------------------------------

This code expires in 10 minutes. Do not share this code with anyone.

Best regards,
CampusInsight AI Security Team
"""
                EmailService._send_raw_email(user_email, subject, body)
            except Exception as e:
                print(f"[EmailService OTP] Logged OTP for {user_email}: {e}")

        threading.Thread(target=send, daemon=True).start()

    @staticmethod
    def _send_raw_email(to_email: str, subject: str, body: str):
        if not settings.EMAILS_ENABLED:
            print(f"[Simulated Email to {to_email}]\nSubject: {subject}\n{body}")
            return

        # If SMTP_USER is configured, send real email via SMTP
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = MIMEMultipart()
                msg["From"] = f"CampusInsight AI <{settings.SMTP_USER}>"
                msg["To"] = to_email
                msg["Subject"] = subject
                msg.attach(MIMEText(body, "plain"))

                if settings.SMTP_PORT == 465:
                    with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                        server.ehlo()
                        server.starttls()
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                        server.send_message(msg)
                print(f"✅ [SMTP SUCCESS] Real email dispatched to inbox: {to_email}")
            except Exception as e:
                print(f"❌ [SMTP ERROR] Failed to deliver real email to {to_email}: {e}")
        else:
            # Clean simulation logging when SMTP is not configured in local dev
            print(f"=== [SIMULATED GMAIL NOTIFICATION DISPATCHED TO: {to_email}] ===")
            print(f"Subject: {subject}")
            print(body)
            print("=========================================================")

email_service = EmailService()
