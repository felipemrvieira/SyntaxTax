from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler as drf_exception_handler

from app.models import Order, Product, User
from app.serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusSerializer,
    ProductSerializer,
    UserSerializer,
)


VALID_ORDER_STATUSES = {"created", "paid", "shipped", "cancelled"}
ALLOWED_STATUS_TRANSITIONS = {
    "created": {"paid", "cancelled"},
    "paid": {"shipped", "cancelled"},
    "shipped": set(),
    "cancelled": set(),
}


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(exc, ValidationError):
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    return response


def parse_positive_decimal(value, name):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValidationError({"detail": f"Query parameter '{name}' is invalid"})
    if parsed <= 0:
        raise ValidationError({"detail": f"Query parameter '{name}' is invalid"})
    return parsed


def parse_positive_int(value, name):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValidationError({"detail": f"Query parameter '{name}' is invalid"})
    if parsed <= 0 or str(parsed) != str(value):
        raise ValidationError({"detail": f"Query parameter '{name}' is invalid"})
    return parsed


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.order_by("id")
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        if User.objects.filter(email=request.data.get("email")).exists():
            return Response({"detail": "Email already exists"}, status=status.HTTP_409_CONFLICT)
        return super().create(request, *args, **kwargs)


class UserRetrieveView(generics.RetrieveAPIView):
    queryset = User.objects.order_by("id")
    serializer_class = UserSerializer


class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.order_by("id")
    serializer_class = ProductSerializer

    def create(self, request, *args, **kwargs):
        price = request.data.get("price")
        try:
            parsed_price = float(price)
        except (TypeError, ValueError):
            parsed_price = 0
        if parsed_price <= 0:
            return Response({"detail": "Field 'price' is invalid"}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Product.objects.order_by("id")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        if min_price is not None:
            queryset = queryset.filter(price__gte=parse_positive_decimal(min_price, "min_price"))
        if max_price is not None:
            queryset = queryset.filter(price__lte=parse_positive_decimal(max_price, "max_price"))
        return queryset


class ProductRetrieveView(generics.RetrieveAPIView):
    queryset = Product.objects.order_by("id")
    serializer_class = ProductSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        queryset = Order.objects.select_related("user").prefetch_related("items__product").order_by("id")
        status_filter = self.request.query_params.get("status")
        user_id = self.request.query_params.get("user_id")
        if status_filter is not None:
            if status_filter not in VALID_ORDER_STATUSES:
                raise ValidationError({"detail": "Query parameter 'status' is invalid"})
            queryset = queryset.filter(status=status_filter)
        if user_id is not None:
            queryset = queryset.filter(user_id=parse_positive_int(user_id, "user_id"))
        return queryset

    def get_serializer_class(self):
        if self.request.method == "POST":
            return OrderCreateSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderRetrieveView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.select_related("user").prefetch_related("items__product").order_by("id")


class OrderStatusUpdateView(generics.GenericAPIView):
    serializer_class = OrderStatusSerializer

    def get_queryset(self):
        return Order.objects.select_related("user").prefetch_related("items__product").order_by("id")

    def patch(self, request, pk):
        order = self.get_object()
        if request.data.get("status") not in VALID_ORDER_STATUSES:
            return Response({"detail": "Field 'status' is invalid"}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        next_status = serializer.validated_data["status"]
        if next_status not in ALLOWED_STATUS_TRANSITIONS.get(order.status, set()):
            return Response({"detail": "Invalid order status transition"}, status=status.HTTP_409_CONFLICT)
        order.status = next_status
        order.save(update_fields=["status"])
        refreshed_order = self.get_queryset().get(pk=order.pk)
        return Response(OrderSerializer(refreshed_order).data)
