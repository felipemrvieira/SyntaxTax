from rest_framework import generics, status
from rest_framework.response import Response

from app.models import Order, Product, User
from app.serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusSerializer,
    ProductSerializer,
    UserSerializer,
)


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.order_by("id")
    serializer_class = UserSerializer


class UserRetrieveView(generics.RetrieveAPIView):
    queryset = User.objects.order_by("id")
    serializer_class = UserSerializer


class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.order_by("id")
    serializer_class = ProductSerializer


class ProductRetrieveView(generics.RetrieveAPIView):
    queryset = Product.objects.order_by("id")
    serializer_class = ProductSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return Order.objects.select_related("user").prefetch_related("items").order_by("id")

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
        return Order.objects.select_related("user").prefetch_related("items").order_by("id")


class OrderStatusUpdateView(generics.GenericAPIView):
    serializer_class = OrderStatusSerializer

    def get_queryset(self):
        return Order.objects.select_related("user").prefetch_related("items").order_by("id")

    def patch(self, request, pk):
        order = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order.status = serializer.validated_data["status"]
        order.save(update_fields=["status"])
        refreshed_order = self.get_queryset().get(pk=order.pk)
        return Response(OrderSerializer(refreshed_order).data)
