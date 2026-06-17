import aiosmtplib
import traceback
from typing import List
from python_common.dto import Mail
import logging
from email.message import EmailMessage

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class MailUtils:

    def __init__(self, email_host, email_port, email_id, email_password):
        self.email_host = email_host
        self.email_port = email_port
        self.email_id = email_id
        self.email_password = email_password
    
    async def send_bulk_email_365(
        self,
        emails: List[Mail],
    ):
        """
        emails = [
            {
                "to": "user1@example.com",
                "subject": "Subject here",
                "html": "<h1>Hello</h1>"
            },
            ...
        ]
        """

        try:
            # Open ONE connection
            smtp = aiosmtplib.SMTP(
                hostname=self.email_host,
                port=self.email_port,
                start_tls=True,
            )

            await smtp.connect()
            await smtp.login(self.email_id, self.email_password)

            for email_data in emails:
                message = EmailMessage()
                message["From"] = self.email_id
                recipients = [email.strip() for email in email_data["to"]]
                message["To"] = ", ".join(recipients)

                message["Subject"] = email_data["subject"]
                message.set_content("This email requires HTML support.")
                message.add_alternative(email_data["html"], subtype="html")

                await smtp.send_message(message)
            
                logger.info(f"Mail sent to: {recipients}")

            await smtp.quit()
            return True

        except Exception as e:
            traceback.print_exc()
            logger.error(f"Bulk email error: {str(e)}")
            # raise e
            return False


    async def send_365_async(
        self,
        recipient_list: list,
        subject: str,
        message: str = None,
        html_message: str = None,
        from_email: str = None,
        fail_silently: bool = False,
    ) -> bool:

        if from_email is None:
            from_email = self.email_id

        try:
            smtp = aiosmtplib.SMTP(
                hostname=self.email_host,
                port=self.email_port,
                start_tls=True,
            )

            await smtp.connect()
            await smtp.login(from_email, self.email_password)

            email_message = EmailMessage()
            email_message["From"] = from_email
            email_message["To"] = ", ".join(recipient_list)
            email_message["Subject"] = subject

            if html_message:
                email_message.set_content("This email requires HTML support.")
                email_message.add_alternative(html_message, subtype="html")
            elif message:
                email_message.set_content(message)

            await smtp.send_message(email_message)
            await smtp.quit()

            logger.info(f"Mail sent to: {recipient_list}")
            return True

        except Exception as e:
            if not fail_silently:
                logger.error(f"Error sending email: {e}")
            return False
 