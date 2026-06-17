from sqlalchemy import Column, Integer, String, JSON, DateTime, func, Boolean
from db.db_config import AMDBase 
from sqlalchemy.dialects.postgresql import ARRAY as Array

class DigestConfiguration(AMDBase):
    __tablename__ = "digest"

    id = Column(Integer, primary_key=True, index=True)
    digest_id = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(255), unique=True, nullable=False)    
    scope = Column(Integer, nullable=False)      
    frequency = Column(Integer, nullable=False)  
    status = Column(Boolean, default=True)
    time = Column(String(8), nullable=False)  # HH:MM:SS
    weekday = Column(Integer, nullable=True)  # 0-6 (Mon-Sun), only for weekly
    day_of_month = Column(Integer, nullable=True)  # 1-31, only for monthly
    recipients = Column(Array(Integer), nullable=True)
    applies_to = Column(Array(Integer), nullable=True)  # List of resource IDs, only for specific resources
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())