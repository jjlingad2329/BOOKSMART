class StripePlan {
  final String id;
  final String name;
  final String? description;
  final List<StripePrice> prices;

  StripePlan({
    required this.id,
    required this.name,
    required this.description,
    required this.prices,
  });

  factory StripePlan.fromJson(Map<String, dynamic> json) {
    return StripePlan(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      prices: (json['prices'] as List)
          .map((e) => StripePrice.fromJson(e))
          .toList(),
    );
  }

  StripePrice get monthly => prices.firstWhere((e) => e.interval == 'month');

  StripePrice get yearly => prices.firstWhere((e) => e.interval == 'year');
}

class StripePrice {
  final String id;
  final int amount;
  final String currency;
  final String interval;

  StripePrice({
    required this.id,
    required this.amount,
    required this.currency,
    required this.interval,
  });

  factory StripePrice.fromJson(Map<String, dynamic> json) {
    return StripePrice(
      id: json['id'],
      amount: json['amount'],
      currency: json['currency'],
      interval: json['interval'],
    );
  }

  double get amountInDollar => amount / 100;
}
