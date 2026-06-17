from config import EMAIL_PASSWORD, EMAIL_HOST, EMAIL_ID, EMAIL_PORT
from typing import List
from python_common.dto.common_dto import Mail
from python_common.utils.mail_utils import MailUtils as BaseMailUtils

class MailUtils:

    @staticmethod
    async def send_bulk_email_365(
        emails: List[Mail],
    ):
        mail_utils = BaseMailUtils(EMAIL_HOST, EMAIL_PORT, EMAIL_ID, EMAIL_PASSWORD)
        return await mail_utils.send_bulk_email_365(emails)

    @staticmethod
    async def send_365_async(
        recipient_list: list,
        subject: str,
        message: str = None,
        html_message: str = None,
        from_email: str = None,
        fail_silently: bool = False,
    ) -> bool:

        mail_utils = BaseMailUtils(EMAIL_HOST, EMAIL_PORT, EMAIL_ID, EMAIL_PASSWORD)
        return await mail_utils.send_365_async(
            recipient_list=recipient_list,
            subject=subject,
            message=message,
            html_message=html_message,
            from_email=from_email,
            fail_silently=fail_silently
        )
 