import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/subscription_controller.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  bool yearly = false;

  @override
  void initState() {
    super.initState();
    Get.put(SubscriptionController(), permanent: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // backgroundColor: const Color(0xFFF7F7FB),
      body: SafeArea(
        child: GetBuilder<SubscriptionController>(
          builder: (SubscriptionController controller) {
            if (controller.responseModel == null) {
              return const Center(child: CircularProgressIndicator());
            }

            if (controller.responseModel!.isError) {
              return Center(
                child: Text(controller.responseModel!.errorMessage),
              );
            }

            final plans = controller.products;

            return Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1100),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 32,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const SizedBox(height: 20),

                      // Title
                      const Text(
                        "Choose your plan",
                        style: TextStyle(
                          fontSize: 34,
                          fontWeight: FontWeight.bold,
                        ),
                      ),

                      const SizedBox(height: 8),

                      Text(
                        "Upgrade to unlock premium features",
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey.shade600,
                        ),
                      ),

                      const SizedBox(height: 30),

                      // Toggle
                      _BillingToggle(
                        yearly: yearly,
                        onChanged: (value) {
                          setState(() => yearly = value);
                        },
                      ),

                      const SizedBox(height: 30),

                      // Plans
                      Wrap(
                        spacing: 20,
                        runSpacing: 20,
                        alignment: WrapAlignment.center,
                        children: plans.map((plan) {
                          final price = yearly ? plan.yearly : plan.monthly;

                          final monthlyCost = plan.monthly.amount / 100;
                          final yearlyCost = plan.yearly.amount / 100;

                          final savings = (monthlyCost * 12) - yearlyCost;

                          return _PlanCard(
                            planName: plan.name,
                            price: price.amount / 100,
                            interval: yearly ? "year" : "month",
                            isPopular: plan.name.toLowerCase().contains("plus"),
                            savings: yearly ? savings : 0,
                            onSelect: () {
                              // TODO: Stripe checkout later
                            },
                          );
                        }).toList(),
                      ),

                      const SizedBox(height: 40),

                      Text(
                        "Cancel anytime • Secure payment via Stripe",
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _BillingToggle extends StatelessWidget {
  final bool yearly;
  final Function(bool) onChanged;

  const _BillingToggle({required this.yearly, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ToggleItem(
            title: "Monthly",
            selected: !yearly,
            onTap: () => onChanged(false),
          ),
          _ToggleItem(
            title: "Yearly",
            selected: yearly,
            onTap: () => onChanged(true),
          ),
        ],
      ),
    );
  }
}

class _ToggleItem extends StatelessWidget {
  final String title;
  final bool selected;
  final VoidCallback onTap;

  const _ToggleItem({
    required this.title,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(25),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                  ),
                ]
              : null,
        ),
        child: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: selected ? Colors.black : Colors.grey,
          ),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final String planName;
  final double price;
  final String interval;
  final bool isPopular;
  final double savings;
  final VoidCallback onSelect;

  const _PlanCard({
    required this.planName,
    required this.price,
    required this.interval,
    required this.isPopular,
    required this.savings,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 320,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        // color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: isPopular ? Border.all(color: Colors.blue, width: 2) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Badge
          if (isPopular)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                "MOST POPULAR",
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),

          const SizedBox(height: 12),

          Text(
            planName,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),

          const SizedBox(height: 10),

          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                "\$${price.toStringAsFixed(0)}",
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 6),
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  "/$interval",
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          if (savings > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                "Save \$${savings.toStringAsFixed(0)} per year",
                style: const TextStyle(
                  color: Colors.green,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

          const SizedBox(height: 20),

          const Text(
            "• Unlimited access\n• Priority support\n• Cancel anytime",
            style: TextStyle(height: 1.6),
          ),

          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onSelect,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text("Choose Plan"),
            ),
          ),
        ],
      ),
    );
  }
}
