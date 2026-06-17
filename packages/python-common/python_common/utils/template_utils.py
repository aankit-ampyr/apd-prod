from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import re

class TemplateUtils:
  
    def __init__(self, model):
        self.email_template_model = model

    async def get_by_ref(self, db: AsyncSession, ref_no: int):
        result = await db.execute(select(self.email_template_model).filter(self.email_template_model.ref_no == ref_no))
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
