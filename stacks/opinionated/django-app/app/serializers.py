from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from app.models import Order, OrderItem, Product, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "price"]


class OrderUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name"]


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["product_id", "product_name", "quantity", "unit_price"]


class OrderSerializer(serializers.ModelSerializer):
    user = OrderUserSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    def get_item_count(self, obj):
        return obj.items.count()

    class Meta:
        model = Order
        fields = ["id", "user", "items", "item_count", "total", "status", "created_at"]


class OrderCreateItemSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), source="product")
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source="user")
    items = OrderCreateItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must contain at least one item")
        return value

    def create(self, validated_data):
        user = validated_data["user"]
        items = validated_data["items"]
        total = sum((item["product"].price * item["quantity"] for item in items), Decimal("0.00"))

        with transaction.atomic():
            order = Order.objects.create(user=user, total=total, status="created")
            for item in items:
                OrderItem.objects.create(
                    order=order,
                    product=item["product"],
                    quantity=item["quantity"],
                    unit_price=item["product"].price,
                )

        return Order.objects.select_related("user").prefetch_related("items__product").get(pk=order.pk)


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["created", "paid", "shipped", "cancelled"])
