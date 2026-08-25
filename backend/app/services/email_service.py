import resend
import threading
from datetime import datetime
from app.core.config import settings

class EmailService:
    @staticmethod
    def _send_resend_email(to_email: str, subject: str, plain_body: str, html_body: str = None) -> bool:
        if not settings.EMAILS_ENABLED:
            print(f"[EmailService] Email dispatch disabled in settings for {to_email}")
            return False

        api_key = settings.RESEND_API_KEY
        if not api_key or not api_key.strip():
            print("[EmailService Error] RESEND_API_KEY is not configured in backend/.env.")
            return False

        resend.api_key = api_key.strip()
        sender = settings.RESEND_FROM_EMAIL or "CampusInsight AI <onboarding@resend.dev>"
        clean_recipient = to_email.strip()

        params = {
            "from": sender,
            "to": [clean_recipient],
            "subject": subject,
            "text": plain_body,
        }
        if html_body:
            params["html"] = html_body

        try:
            r = resend.Emails.send(params)
            email_id = r.get("id") if isinstance(r, dict) else getattr(r, "id", "N/A")
            print(f"[EmailService] OTP email sent successfully to {clean_recipient} (id: {email_id})")
            return True
        except Exception as e:
            print(f"[EmailService Error] Resend email delivery failed to {clean_recipient}: {type(e).__name__} - {str(e)}")
            return False

    @staticmethod
    def send_verification_otp(user_email: str, user_name: str, otp_code: str, expiry_minutes: int = 5) -> bool:
        """
        Sends a 6-digit Security Verification Code directly to the recipient email address via Resend.
        Subject: CampusInsight AI — Your Verification Code
        Returns True if Resend accepted the email, False otherwise.
        NEVER logs the OTP code or API key.
        """
        subject = "CampusInsight AI — Your Verification Code"
        plain_body = f"""CampusInsight AI
Your verification code is:
{otp_code}

This verification code expires in {expiry_minutes} minutes.

Security warning:
Do not share this code with anyone.
CampusInsight AI representatives will never ask for your verification code.
"""
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }}
            .container {{ max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; }}
            .header {{ border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }}
            .title {{ font-size: 22px; font-weight: bold; color: #0f172a; margin: 0; }}
            .subtitle {{ font-size: 13px; color: #64748b; margin-top: 4px; }}
            .otp-card {{ background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px dashed #3b82f6; border-radius: 16px; padding: 24px; margin: 24px 0; }}
            .otp-heading {{ font-size: 12px; font-weight: 700; uppercase; color: #1e40af; letter-spacing: 1px; margin-bottom: 8px; }}
            .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #1d4ed8; letter-spacing: 8px; margin: 8px 0; }}
            .expiry-badge {{ display: inline-block; background-color: #dcfce7; color: #15803d; font-weight: 600; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin-top: 8px; }}
            .warning-text {{ font-size: 12px; color: #94a3b8; margin-top: 24px; line-height: 1.5; text-align: left; background: #f8fafc; padding: 12px 16px; border-radius: 8px; }}
            .footer {{ font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">CampusInsight AI</div>
              <div class="subtitle">Security Email Verification</div>
            </div>
            <h3 style="color: #1e293b; margin-bottom: 4px;">Your Verification Code</h3>
            <p style="font-size: 13px; color: #64748b; margin-top: 0;">Use the code below to complete your authentication action.</p>
            
            <div class="otp-card">
              <div class="otp-heading">Verification Security Code</div>
              <div class="otp-code">{otp_code}</div>
              <div class="expiry-badge">Expires in {expiry_minutes} minutes</div>
            </div>

            <div class="warning-text">
              <strong>Security warning:</strong> Do not share this code with anyone. CampusInsight AI representatives will never ask for your verification code.
            </div>
            
            <div class="footer">
              CampusInsight AI Security Team &bull; NAAC Criterion 1 Portal
            </div>
          </div>
        </body>
        </html>
        """
        # Save internal inbox record as backup
        EmailService._save_internal_inbox_message(user_email, "User", "System", subject, plain_body)

        # Deliver real email synchronously via Resend
        return EmailService._send_resend_email(user_email, subject, plain_body, html_body)

    @staticmethod
    def send_verification_otp_async(user_email: str, user_name: str, otp_code: str, expiry_minutes: int = 5):
        """
        Backwards-compatible wrapper.
        """
        return EmailService.send_verification_otp(user_email, user_name, otp_code, expiry_minutes)

    @staticmethod
    def send_login_notification_async(user_email: str, user_name: str, role: str = "User", department: str = "General", ip_address: str = "127.0.0.1"):
        """
        Sends security login notification email via Resend after successful authentication.
        Subject: CampusInsight AI — New Login Detected
        Does NOT expose passwords, tokens, API keys, or OTPs.
        """
        def send():
            try:
                subject = "CampusInsight AI — New Login Detected"
                login_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
                
                plain_body = f"""CampusInsight AI
Hello {user_name},

Your account was successfully logged in to CampusInsight AI.

Login Details:
--------------------------------------------------
Application Name : CampusInsight AI - NAAC Criterion 1 Portal
User Email       : {user_email}
Login Date & Time: {login_time}
IP Address       : {ip_address}
Assigned Role    : {role} ({department})
--------------------------------------------------

Security warning:
If you did not perform this login, please secure your account or contact system administration immediately.

Best regards,
CampusInsight AI Security Team
"""
                html_body = f"""
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
                    .header {{ text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 24px; }}
                    .title {{ font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }}
                    .subtitle {{ font-size: 13px; color: #64748b; margin-top: 4px; }}
                    .notice-box {{ background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0; color: #065f46; font-size: 14px; font-weight: 600; }}
                    .info-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13.5px; }}
                    .info-table td {{ padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }}
                    .info-table td.label {{ font-weight: 600; color: #475569; width: 40%; }}
                    .warning-box {{ background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px; font-size: 12.5px; color: #9f1239; margin-top: 24px; line-height: 1.5; }}
                    .footer {{ font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 28px; }}
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div class="title">CampusInsight AI</div>
                      <div class="subtitle">Security Notification System</div>
                    </div>
                    <h2>New Login to CampusInsight AI</h2>
                    <div class="notice-box">
                      Your account was successfully logged in to CampusInsight AI.
                    </div>
                    <table class="info-table">
                      <tr><td class="label">Application Name</td><td>CampusInsight AI - NAAC Criterion 1 Portal</td></tr>
                      <tr><td class="label">User Email</td><td>{user_email}</td></tr>
                      <tr><td class="label">Login Date & Time</td><td>{login_time}</td></tr>
                      <tr><td class="label">Client IP Address</td><td>{ip_address}</td></tr>
                      <tr><td class="label">Account Role</td><td>{role} ({department})</td></tr>
                    </table>
                    <div class="warning-box">
                      <strong>Security warning:</strong> If you did not perform this login, please contact your System Administrator immediately.
                    </div>
                    <div class="footer">
                      CampusInsight AI Security Team &bull; NAAC Criterion 1 Portal
                    </div>
                  </div>
                </body>
                </html>
                """
                EmailService._save_internal_inbox_message(user_email, role, "System", subject, plain_body)
                EmailService._send_resend_email(user_email, subject, plain_body, html_body)
            except Exception as e:
                print(f"[EmailService Notification Error] {e}")

        threading.Thread(target=send, daemon=True).start()

    @staticmethod
    def send_welcome_account_created_async(user_email: str, user_name: str, role: str, department: str):
        def send():
            try:
                subject = "Welcome to CampusInsight AI - Account Registration & Access Confirmation"
                plain_body = f"""Hello {user_name},

Welcome to CampusInsight AI! Your institutional user account has been successfully registered.

Account Details:
--------------------------------------------------
Registered Email : {user_email}
Assigned Role    : {role}
Department       : {department}
System Access    : NAAC Accreditation Criterion 1 (Curricular Aspects)
Timestamp        : {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
--------------------------------------------------

You can now log in to access your institutional dashboard, upload Criterion 1 evidence documents, and view AI-generated compliance analytics.

Best regards,
CampusInsight AI Administration Team
NAAC Criterion 1 Portal
"""
                html_body = f"""
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
                    .header {{ text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 24px; }}
                    .title {{ font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }}
                    .subtitle {{ font-size: 13px; color: #64748b; margin-top: 4px; }}
                    .card {{ background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; font-size: 14px; line-height: 1.6; }}
                    .footer {{ font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 28px; }}
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div class="title">CampusInsight AI</div>
                      <div class="subtitle">NAAC Criterion 1 Intelligent Portal</div>
                    </div>
                    <h2>Welcome, {user_name}!</h2>
                    <p>Your institutional user account has been successfully registered.</p>
                    <div class="card">
                      <strong>Registered Email:</strong> {user_email}<br>
                      <strong>Assigned Role:</strong> {role}<br>
                      <strong>Department:</strong> {department}<br>
                      <strong>System Access:</strong> NAAC Accreditation Criterion 1<br>
                      <strong>Timestamp:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
                    </div>
                    <p>You can now log in to access your institutional dashboard, upload evidence documents, and inspect AI compliance analytics.</p>
                    <div class="footer">
                      CampusInsight AI Security & Administration Team &bull; NAAC Criterion 1 Portal
                    </div>
                  </div>
                </body>
                </html>
                """
                EmailService._save_internal_inbox_message(user_email, role, "System", subject, plain_body)
                EmailService._send_resend_email(user_email, subject, plain_body, html_body)
            except Exception as e:
                print(f"[EmailService Welcome Error] {e}")

        threading.Thread(target=send, daemon=True).start()

    @staticmethod
    def send_inbox_email_async(to_email: str, sender_name: str, subject: str, body: str):
        def send():
            try:
                full_subject = f"CampusInsight AI Mail: {subject}"
                email_body = f"""Hello,

You have received a new internal accreditation message from {sender_name} in CampusInsight AI.

Subject: {subject}
--------------------------------------------------
{body}
--------------------------------------------------

Timestamp: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

Best regards,
CampusInsight AI Mail Dispatcher
NAAC Criterion 1 Portal
"""
                EmailService._send_resend_email(to_email, full_subject, email_body)
            except Exception as e:
                print(f"[EmailService Inbox Error] {e}")

        threading.Thread(target=send, daemon=True).start()

    @staticmethod
    def _save_internal_inbox_message(recipient_email: str, role: str, category: str, subject: str, body: str):
        try:
            from app.core.database import SessionLocal
            from app.models.models import User, InboxMessage
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.email == recipient_email).first()
                inbox_msg = InboxMessage(
                    sender_name="CampusInsight System Security",
                    recipient_user_id=user.id if user else None,
                    recipient_email=recipient_email,
                    recipient_role=role,
                    category=category,
                    subject=subject,
                    body=body,
                    target_type="System",
                    is_read=False
                )
                db.add(inbox_msg)
                db.commit()
            finally:
                db.close()
        except Exception as err:
            print(f"[EmailService] Error writing internal inbox message: {err}")

email_service = EmailService()
