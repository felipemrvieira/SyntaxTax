from django.urls import path

from app.views import (
    OrderListCreateView,
    OrderRetrieveView,
    OrderStatusUpdateView,
    ProductListCreateView,
    ProductRetrieveView,
    UserListCreateView,
    UserRetrieveView,
)


urlpatterns = [
    path("users", UserListCreateView.as_view()),
    path("users/<int:pk>", UserRetrieveView.as_view()),
    path("products", ProductListCreateView.as_view()),
    path("products/<int:pk>", ProductRetrieveView.as_view()),
    path("orders", OrderListCreateView.as_view()),
    path("orders/<int:pk>", OrderRetrieveView.as_view()),
    path("orders/<int:pk>/status", OrderStatusUpdateView.as_view()),
]
