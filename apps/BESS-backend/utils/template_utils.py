from models import EmailTemplate
from sqlalchemy import select
import re

class TemplateUtils:
    def __new__(cls):
        if not hasattr(cls, "instance"):
            cls.instance = super(TemplateUtils, cls).__new__(cls)
        return cls.instance

    async def get_by_ref(self, db, ref_no):
        result = await db.execute(select(EmailTemplate).filter(EmailTemplate.ref_no == ref_no))
        return result.scalar_one_or_none()

    def get_subject(self, template, **kwargs) -> str:
        subject = template.subject
        for key, value in kwargs.items():
            subject = subject.replace("{" + key + "}", str(value))
        return subject

    def get_message(self, template, **kwargs) -> str:
        message = template.body
        for key, value in kwargs.items():
            message = re.sub(r"{{\s*" + re.escape(key) + r"\s*}}", str(value), message)
        return message

template_utils = TemplateUtils()

__all__ = ["template_utils"]