from db.db_config import BaseUser
from python_common.models import EmailTemplateMixin
class EmailTemplate(EmailTemplateMixin, BaseUser):
    __tablename__ = "templates"
