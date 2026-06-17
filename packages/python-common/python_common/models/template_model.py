from sqlalchemy import Column, Integer, String, Text

class EmailTemplateMixin:
    id = Column(Integer, primary_key=True, index=True)
    ref_no = Column(Integer, unique=True, nullable=False)
    subject = Column(String(255), nullable=False)  
    body = Column(Text, nullable=False)  