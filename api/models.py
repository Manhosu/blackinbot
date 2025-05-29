from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums
class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentMethod(str, Enum):
    PIX = "pix"
    CREDIT_CARD = "credit_card"
    MERCADO_PAGO = "mercado_pago"
    PUSHINPAY = "pushinpay"

class BotStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    SETUP_REQUIRED = "setup_required"

class PlanPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"
    LIFETIME = "lifetime"

# Modelos base
class UserBase(BaseModel):
    email: EmailStr
    name: str
    telegram_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class BotBase(BaseModel):
    name: str
    token: str
    description: Optional[str] = None
    owner_id: str
    webhook_url: Optional[str] = None
    status: BotStatus = BotStatus.SETUP_REQUIRED

class BotCreate(BotBase):
    pass

class BotResponse(BotBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class GroupBase(BaseModel):
    name: str
    telegram_id: str
    bot_id: str
    description: Optional[str] = None
    is_vip: bool = True

class GroupCreate(GroupBase):
    pass

class GroupResponse(GroupBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PlanBase(BaseModel):
    name: str
    bot_id: str
    price: float
    period: PlanPeriod
    description: Optional[str] = None
    is_active: bool = True
    days_access: int

class PlanCreate(PlanBase):
    pass

class PlanResponse(PlanBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PaymentBase(BaseModel):
    user_telegram_id: str
    bot_id: str
    plan_id: str
    amount: float
    method: PaymentMethod
    status: PaymentStatus = PaymentStatus.PENDING
    transaction_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class SaleBase(BaseModel):
    payment_id: str
    bot_id: str
    plan_id: str
    user_telegram_id: str
    amount: float
    expires_at: Optional[datetime] = None

class SaleCreate(SaleBase):
    pass

class SaleResponse(SaleBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReminderBase(BaseModel):
    payment_id: str
    user_telegram_id: str
    bot_id: str
    message: str
    scheduled_for: datetime
    sent: bool = False

class ReminderCreate(ReminderBase):
    pass

class ReminderResponse(ReminderBase):
    id: str
    created_at: datetime
    sent_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Modelos para estatísticas e relatórios
class DashboardStats(BaseModel):
    total_sales: int
    total_revenue: float
    active_users: int
    plans_count: int
    recent_sales: List[SaleResponse] 