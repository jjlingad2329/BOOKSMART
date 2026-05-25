import 'dart:async';
import 'package:booksmart/constant/exports.dart';
import 'package:booksmart/helpers/currency_formatter.dart';
import 'package:booksmart/models/transaction_model.dart';
import 'package:booksmart/modules/admin/controllers/category_controler.dart';
import 'package:booksmart/modules/user/controllers/grouped_transaction_controller.dart';
import 'package:booksmart/modules/user/controllers/organization_controller.dart';
import 'package:booksmart/supabase/tables.dart';
import 'package:booksmart/utils/supabase.dart';
import 'package:get/get.dart';
import 'package:pie_chart/pie_chart.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'dart:developer' as dev;

class AIDeductionPage extends StatefulWidget {
  const AIDeductionPage({super.key});

  @override
  State<AIDeductionPage> createState() => _AIDeductionPageState();
}

class _AIDeductionPageState extends State<AIDeductionPage> {
  late CategoryAdminController _catCtrl;
  final TextEditingController _searchCtrl = TextEditingController();
  Timer? _debounce;
  String _search = '';

  DateTimeRange _activeRange = DateTimeRange(
    start: DateTime.now().subtract(const Duration(days: 365)),
    end: DateTime.now(),
  );

  bool _isLoading = false;
  List<dynamic> _rpcResults = [];
  final Map<int, List<TransactionModel>> _txBySubCat = {};
  int? _userStateId;

  // UI state variables
  final Set<int> _expandedCategoryIds = {};
  String _selectedDeductionType = 'Federal';
  double _totalAmount = 0.0;
  int _totalTransactionsCount = 0;
  int _matchedTransactionsCount = 0;
  int _unmatchedTransactionsCount = 0;

  final List<Color> curatedColors = const [
    Color(0xFF2B7FFF), // Blue
    Color(0xFF34C759), // Green
    Color(0xFF9E00FF), // Purple
    Color(0xFFFFCC00), // Yellow/Orange
    Color(0xFFFF9500), // Orange
    Color(0xFF00C7BE), // Teal
    Color(0xFFFF2D55), // Pink
    Color(0xFF5856D6), // Indigo
    Color(0xFF64748B), // Slate
    Color(0xFF8E8E93), // Grey
  ];

  @override
  void initState() {
    super.initState();

    if (Get.isRegistered<CategoryAdminController>()) {
      _catCtrl = Get.find<CategoryAdminController>();
    } else {
      _catCtrl = Get.put(CategoryAdminController());
    }

    _loadData();
    _searchCtrl.addListener(_onSearchChanged);
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      if (_catCtrl.categories.isEmpty) {
        await _catCtrl.fetchAll();
      }

      final org = getCurrentOrganization;
      if (org == null) return;

      _userStateId = org.stateId;

      final tag = getGroupedTransactionControllerTag(
        _activeRange.start,
        _activeRange.end,
      );
      final GroupedTransactionController groupedCtrl =
          Get.isRegistered<GroupedTransactionController>(tag: tag)
          ? Get.find<GroupedTransactionController>(tag: tag)
          : Get.put(
              GroupedTransactionController(
                startDate: _activeRange.start,
                endDate: _activeRange.end,
              ),
              tag: tag,
            );

      _rpcResults = await groupedCtrl.loadSubcategoryTotalsWithDeductions(
        _userStateId,
      );
      _txBySubCat.clear();

      final txsRes = await supabase
          .from(SupabaseTable.transaction)
          .select()
          .eq('org_id', org.id)
          .gte('date_time', _activeRange.start.toIso8601String().split('T')[0])
          .lte('date_time', _activeRange.end.toIso8601String().split('T')[0]);

      final List<TransactionModel> allTxs = (txsRes as List)
          .map((e) => TransactionModel.fromJson(e))
          .toList();

      for (final tx in allTxs) {
        if (tx.subcategory != null) {
          _txBySubCat.putIfAbsent(tx.subcategory!, () => []).add(tx);
        }
      }

      double tempTotalAmount = 0.0;
      for (final tx in allTxs) {
        tempTotalAmount += tx.amount.abs();
      }

      _totalAmount = tempTotalAmount;
      _totalTransactionsCount = allTxs.length;
      _matchedTransactionsCount = allTxs.where((tx) => tx.isAiVerified).length;
      _unmatchedTransactionsCount = allTxs
          .where((tx) => !tx.isAiVerified)
          .length;

      if (_catCtrl.states.isEmpty) {
        await _catCtrl.fetchStates();
      }
    } catch (e) {
      dev.log("Error loading AI Deduction data: $e");
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _fetchSubCategoryTransactions(int subCatId) async {
    if (_txBySubCat.containsKey(subCatId)) return;

    try {
      final res = await supabase
          .from(SupabaseTable.transaction)
          .select()
          .eq('org_id', getCurrentOrganization!.id)
          .eq('sub_category_id', subCatId)
          .gte('date_time', _activeRange.start.toIso8601String())
          .lte('date_time', _activeRange.end.toIso8601String());

      final List<TransactionModel> txs = (res as List)
          .map((e) => TransactionModel.fromJson(e))
          .toList();

      setState(() {
        _txBySubCat[subCatId] = txs;
      });
    } catch (e) {
      dev.log("Error fetching transactions for subcategory $subCatId: $e");
    }
  }

  Map<String, double> _computePieData() {
    final Map<String, double> map = {};
    for (var row in _rpcResults) {
      final subId = row['sub_category_id'] as int;
      final stateDed = (row['state_deduction'] ?? 0.0) as double;
      final fedDed = (row['federal_deduction'] ?? 0.0) as double;
      final totalDed = stateDed + fedDed;
      final subName = _catCtrl.getSubCategoryName(subId);
      if (totalDed > 0) {
        if (_search.isEmpty ||
            subName.toLowerCase().contains(_search.toLowerCase())) {
          map[subName] = totalDed;
        }
      }
    }
    return map;
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () {
      setState(() => _search = _searchCtrl.text);
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  String _getDateRangeText() {
    final start = _activeRange.start;
    final end = _activeRange.end;
    String pad(int n) => n.toString().padLeft(2, '0');
    return '${_getMonthName(start.month)} ${pad(start.day)}, ${start.year} - ${_getMonthName(end.month)} ${pad(end.day)}, ${end.year}';
  }

  String _getMonthName(int month) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months[month - 1];
  }

  String _formatCurrency(double n) => CurrencyUtils.format(n);

  Widget _buildStatCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String title,
    required String value,
    required String subtext,
    Color? subtextColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0C2346).withOpacity(0.4),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: iconBgColor.withOpacity(0.12),
              shape: BoxShape.circle,
              border: Border.all(color: iconColor.withOpacity(0.3), width: 1),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Text(
                  subtext,
                  style: TextStyle(
                    color: subtextColor ?? Colors.white54,
                    fontSize: 11,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubTable(int subCatId, String categoryName, int txCount) {
    List<dynamic> subTxs = _txBySubCat[subCatId] ?? [];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
      color: const Color(0xFF071426),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              children: const [
                Expanded(
                  flex: 2,
                  child: Text(
                    'Date',
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  flex: 4,
                  child: Text(
                    'Description',
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    'Merchant',
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'Total Amount',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'Deduction Amount',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'Deduction Rate',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Text(
                    '',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(color: Colors.white12, height: 1),
          if (subTxs.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16.0),
              child: Center(
                child: Text(
                  'No transactions found in this category',
                  style: TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ),
            )
          else
            ...subTxs.map((tx) {
              String dateStr = '';
              String descStr = '';
              String merchantStr = '';
              double totalAmt = 0.0;
              double dedAmt = 0.0;
              String rateStr = '';

              final t = tx as TransactionModel;
              dateStr =
                  '${_getMonthName(t.dateTime.month)} ${t.dateTime.day}, ${t.dateTime.year}';
              descStr = t.description.isNotEmpty ? t.description : t.title;
              merchantStr = t.title;
              totalAmt = t.amount.abs();
              dedAmt = t.deductible ? t.amount.abs() : 0.0;
              rateStr = t.deductible ? '100%' : '0%';

              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 10.0),
                child: Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        dateStr,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 4,
                      child: Text(
                        descStr,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        merchantStr,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        _formatCurrency(totalAmt),
                        textAlign: TextAlign.end,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        _formatCurrency(dedAmt),
                        textAlign: TextAlign.end,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        rateStr,
                        textAlign: TextAlign.end,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 1,
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: MouseRegion(
                          cursor: SystemMouseCursors.click,
                          child: GestureDetector(
                            onTap: () {},
                            child: const Icon(
                              Icons.visibility_outlined,
                              color: Colors.white54,
                              size: 16,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _buildHeader(double width) {
    final isMobile = width < 720;
    final isVerySmall = width < 480;

    final titleColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: const [
        Text(
          'AI Deductions',
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        SizedBox(height: 4),
        Text(
          'Review AI-identified deductions and their impact on your taxes.',
          style: TextStyle(color: Colors.white70, fontSize: 14),
        ),
      ],
    );

    final datePickerBtn = GestureDetector(
      onTap: () async {
        final now = DateTime.now();
        final DateTimeRange? pickedRange = await showDateRangePicker(
          context: context,
          firstDate: DateTime(now.year - 2),
          lastDate: DateTime(now.year + 2),
          initialDateRange: DateTimeRange(
            start: _activeRange.start,
            end: _activeRange.end,
          ),
          builder: (context, child) {
            return Center(
              child: Container(
                margin: const EdgeInsets.all(20),
                width: 400,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300, width: 1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: child,
                ),
              ),
            );
          },
        );
        if (pickedRange != null) {
          setState(() {
            _activeRange = pickedRange;
          });
          _loadData();
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.white.withOpacity(0.08)),
          borderRadius: BorderRadius.circular(8),
          color: const Color(0xFF0C2346).withOpacity(0.3),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.calendar_today_outlined,
              color: Colors.white70,
              size: 16,
            ),
            const SizedBox(width: 8),
            Text(
              _getDateRangeText(),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.keyboard_arrow_down,
              color: Colors.white70,
              size: 16,
            ),
          ],
        ),
      ),
    );

    final deductionTypeDropdown = Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white.withOpacity(0.08)),
        borderRadius: BorderRadius.circular(8),
        color: const Color(0xFF0C2346).withOpacity(0.3),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedDeductionType,
          dropdownColor: const Color(0xFF0C2346),
          icon: const Icon(Icons.keyboard_arrow_down, color: Colors.white70, size: 16),
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
          onChanged: (String? newValue) {
            if (newValue != null) {
              setState(() {
                _selectedDeductionType = newValue;
              });
            }
          },
          items: <String>['Federal', 'State']
              .map<DropdownMenuItem<String>>((String value) {
            return DropdownMenuItem<String>(
              value: value,
              child: Text(value),
            );
          }).toList(),
        ),
      ),
    );

    if (isMobile) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          titleColumn,
          const SizedBox(height: 16),
          if (isVerySmall)
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [datePickerBtn, const SizedBox(height: 12), deductionTypeDropdown],
            )
          else
            Row(
              children: [
                Expanded(child: datePickerBtn),
                const SizedBox(width: 12),
                Expanded(child: deductionTypeDropdown),
              ],
            ),
        ],
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(child: titleColumn),
        const SizedBox(width: 16),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [datePickerBtn, const SizedBox(width: 12), deductionTypeDropdown],
        ),
      ],
    );
  }

  Widget _buildStatsGrid(
    double width,
    double totalAmt,
    double totalDeds,
    double deductionRate,
    int totalTxs,
    int matchedTxs,
    int unmatchedTxs,
    double matchedPercent,
    double unmatchedPercent,
  ) {
    final cards = [
      _buildStatCard(
        icon: LucideIcons.wallet,
        iconColor: const Color(0xFF2B7FFF),
        iconBgColor: const Color(0xFF2B7FFF),
        title: "Total Amount",
        value: _formatCurrency(totalAmt),
        subtext: "100% of transactions",
      ),
      _buildStatCard(
        icon: LucideIcons.database,
        iconColor: const Color(0xFF34C759),
        iconBgColor: const Color(0xFF34C759),
        title: "Total Deductions",
        value: _formatCurrency(totalDeds),
        subtext: "${deductionRate.toStringAsFixed(2)}% of total amount",
        subtextColor: const Color(0xFF34C759),
      ),
      _buildStatCard(
        icon: LucideIcons.percent,
        iconColor: const Color(0xFF9E00FF),
        iconBgColor: const Color(0xFF9E00FF),
        title: "Deduction Rate",
        value: "${deductionRate.toStringAsFixed(2)}%",
        subtext: "Average deduction rate",
      ),
      _buildStatCard(
        icon: LucideIcons.fileText,
        iconColor: const Color(0xFFFFCC00),
        iconBgColor: const Color(0xFFFFCC00),
        title: "Total Transactions",
        value: "$totalTxs",
        subtext: "Across all categories",
      ),
      _buildStatCard(
        icon: LucideIcons.checkCircle2,
        iconColor: const Color(0xFF34C759),
        iconBgColor: const Color(0xFF34C759),
        title: "Matched Transactions",
        value: "$matchedTxs",
        subtext: "${matchedPercent.toStringAsFixed(1)}% of total",
        subtextColor: const Color(0xFF34C759),
      ),
      _buildStatCard(
        icon: LucideIcons.alertTriangle,
        iconColor: const Color(0xFFFF3B30),
        iconBgColor: const Color(0xFFFF3B30),
        title: "Unmatched Transactions",
        value: "$unmatchedTxs",
        subtext: "${unmatchedPercent.toStringAsFixed(1)}% of total",
        subtextColor: const Color(0xFFFF3B30),
      ),
    ];

    int crossAxisCount = 3;
    double childAspectRatio = 1.7;

    if (width < 600) {
      crossAxisCount = 1;
      childAspectRatio = 3.5;
    } else if (width < 1100) {
      crossAxisCount = 2;
      childAspectRatio = 2.0;
    } else {
      crossAxisCount = 2;
      childAspectRatio = 2.2;
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: childAspectRatio,
      ),
      itemCount: cards.length,
      itemBuilder: (context, index) => cards[index],
    );
  }

  Widget _buildPieChartCard(
    Map<String, double> pieMap,
    List<Color> colorList,
    List<MapEntry<String, double>> ordered,
    double overall,
    Color Function(String) getCategoryColor, {
    bool isExpanded = false,
  }) {
    final mainContent = LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 420;
        final chartWidget = Container(
          height: 220,
          width: 220,
          alignment: Alignment.center,
          child: PieChart(
            dataMap: pieMap,
            chartType: ChartType.ring,
            colorList: colorList,
            chartRadius: 150,
            ringStrokeWidth: 32,
            centerWidget: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Total Deductions',
                  style: TextStyle(color: Colors.white54, fontSize: 10),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatCurrency(overall),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            chartValuesOptions: const ChartValuesOptions(
              showChartValues: false,
              showChartValuesInPercentage: true,
              showChartValuesOutside: true,
              decimalPlaces: 1,
              chartValueStyle: TextStyle(
                color: Colors.black,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
            legendOptions: const LegendOptions(showLegends: false),
          ),
        );

        final legendWidget = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: ordered.map((entry) {
            final color = getCategoryColor(entry.key);
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 6.0),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      entry.key,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    _formatCurrency(entry.value),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        );

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              chartWidget,
              const SizedBox(width: 24),
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: legendWidget,
                ),
              ),
            ],
          );
        } else {
          return SingleChildScrollView(
            child: Column(
              children: [
                Center(child: chartWidget),
                const SizedBox(height: 20),
                legendWidget,
              ],
            ),
          );
        }
      },
    );

    return Card(
      color: const Color(0xFF0C2346).withOpacity(0.4),
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.white.withOpacity(0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Text(
                  "Deductions by Category",
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                SizedBox(width: 6),
                Icon(Icons.info_outline, color: Colors.white54, size: 16),
              ],
            ),
            const SizedBox(height: 20),
            isExpanded ? Expanded(child: mainContent) : mainContent,
          ],
        ),
      ),
    );
  }

  Widget _buildBreakdownHeader() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'Deductions Breakdown',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 4),
              Text(
                'Click on a category to view matching transactions',
                style: TextStyle(color: Colors.white54, fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Container(
          width: 240,
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFF0C2346).withOpacity(0.3),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: TextField(
            controller: _searchCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: const InputDecoration(
              hintText: 'Search categories...',
              hintStyle: TextStyle(color: Colors.white30, fontSize: 13),
              prefixIcon: Icon(Icons.search, color: Colors.white30, size: 16),
              border: InputBorder.none,
              contentPadding: EdgeInsets.only(bottom: 12),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Container(
          height: 38,
          width: 38,
          decoration: BoxDecoration(
            color: const Color(0xFF0C2346).withOpacity(0.3),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: const Icon(Icons.filter_list, color: Colors.white70, size: 18),
        ),
      ],
    );
  }

  Widget _buildBreakdownTable(
    List<dynamic> rows,
    Color Function(String) getCategoryColor,
  ) {
    if (rows.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(
          color: const Color(0xFF0C2346).withOpacity(0.2),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: Text(
            'No transactions available',
            style: TextStyle(color: Colors.white54, fontSize: 14),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0C2346).withOpacity(0.2),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
              vertical: 16.0,
              horizontal: 16.0,
            ),
            child: Row(
              children: const [
                Expanded(
                  flex: 4,
                  child: Text(
                    'Category',
                    style: TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    'Total Amount',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    'Total Deductions',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    'Deduction Rate',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'Transactions',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Text(
                    'Action',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(color: Colors.white12, height: 1),
          ...rows.map((row) {
            int subId = row['sub_category_id'] as int;
            String categoryName = _catCtrl.getSubCategoryName(subId);
            double totalAmount = (row['total_amount'] ?? 0.0) as double;
            double stateDed = (row['state_deduction'] ?? 0.0) as double;
            double fedDed = (row['federal_deduction'] ?? 0.0) as double;
            double totalDeductions = _selectedDeductionType == 'Federal' ? fedDed : stateDed;
            double deductionRate = totalAmount > 0
                ? (totalDeductions / totalAmount) * 100
                : 0.0;
            int txCount = _txBySubCat[subId]?.length ?? 0;

            final isExpanded = _expandedCategoryIds.contains(subId);
            final categoryColor = getCategoryColor(categoryName);

            return Column(
              children: [
                InkWell(
                  onTap: () {
                    setState(() {
                      if (isExpanded) {
                        _expandedCategoryIds.remove(subId);
                      } else {
                        _expandedCategoryIds.add(subId);
                        _fetchSubCategoryTransactions(subId);
                      }
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      vertical: 16,
                      horizontal: 16,
                    ),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: Colors.white.withOpacity(0.04),
                          width: 1,
                        ),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 4,
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: categoryColor,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  categoryName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          flex: 3,
                          child: Text(
                            _formatCurrency(totalAmount),
                            textAlign: TextAlign.end,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 3,
                          child: Text(
                            _formatCurrency(totalDeductions),
                            textAlign: TextAlign.end,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 3,
                          child: Text(
                            "${deductionRate.toStringAsFixed(2)}%",
                            textAlign: TextAlign.end,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 2,
                          child: Text(
                            "$txCount",
                            textAlign: TextAlign.end,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 1,
                          child: Icon(
                            isExpanded
                                ? Icons.keyboard_arrow_up
                                : Icons.keyboard_arrow_down,
                            color: Colors.white54,
                            size: 18,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (isExpanded) _buildSubTable(subId, categoryName, txCount),
              ],
            );
          }),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final pieData = _computePieData();
    final overall = pieData.values.fold<double>(0.0, (a, b) => a + b);

    final ordered = pieData.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final pieMap = Map<String, double>.fromEntries(
      ordered.isEmpty ? [MapEntry('No data', 1.0)] : ordered,
    );

    final colorList = ordered.isEmpty
        ? [colorScheme.primary]
        : List.generate(ordered.length, (index) {
            if (index < curatedColors.length) {
              return curatedColors[index];
            }
            final hue = (index * 137.508) % 360;
            return HSLColor.fromAHSL(1.0, hue, 0.65, 0.55).toColor();
          });

    final totalAmt = _totalAmount;
    
    double calculatedTotalDeductions = 0.0;
    final List<MapEntry<String, double>> categoryDeductions = [];
    for (var r in _rpcResults) {
      final subId = r['sub_category_id'] as int;
      final subName = _catCtrl.getSubCategoryName(subId);
      final stateDed = (r['state_deduction'] ?? 0.0) as double;
      final fedDed = (r['federal_deduction'] ?? 0.0) as double;
      final totalDed = _selectedDeductionType == 'Federal' ? fedDed : stateDed;
      
      calculatedTotalDeductions += totalDed;
      
      if (totalDed > 0) {
        categoryDeductions.add(MapEntry(subName, totalDed));
      }
    }
    categoryDeductions.sort((a, b) => b.value.compareTo(a.value));

    final totalDeds = calculatedTotalDeductions;
    final deductionRate = totalAmt > 0 ? (totalDeds / totalAmt) * 100 : 0.0;
    final totalTxs = _totalTransactionsCount;
    final matchedTxs = _matchedTransactionsCount;
    final unmatchedTxs = _unmatchedTransactionsCount;
    final matchedPercent = totalTxs > 0 ? (matchedTxs / totalTxs) * 100 : 0.0;
    final unmatchedPercent = totalTxs > 0
        ? (unmatchedTxs / totalTxs) * 100
        : 0.0;

    Color getCategoryColor(String name) {
      final idx = categoryDeductions.indexWhere((entry) => entry.key == name);
      if (idx != -1 && idx < curatedColors.length) {
        return curatedColors[idx];
      }
      return Colors.grey;
    }

    final List<dynamic> rows = _rpcResults.where((r) {
      if (_search.isEmpty) return true;
      final subId = r['sub_category_id'] as int;
      return _catCtrl
          .getSubCategoryName(subId)
          .toLowerCase()
          .contains(_search.toLowerCase());
    }).toList();

    return Scaffold(
      backgroundColor: primaryColor,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF2B7FFF)),
            )
          : LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                final isLargeScreen = width > 1100;

                return SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildHeader(width),
                      const SizedBox(height: 24),
                      if (isLargeScreen)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 6,
                              child: _buildPieChartCard(
                                pieMap,
                                colorList,
                                ordered,
                                overall,
                                getCategoryColor,
                              ),
                            ),
                            const SizedBox(width: 20),
                            Expanded(
                              flex: 5,
                              child: _buildStatsGrid(
                                width,
                                totalAmt,
                                totalDeds,
                                deductionRate,
                                totalTxs,
                                matchedTxs,
                                unmatchedTxs,
                                matchedPercent,
                                unmatchedPercent,
                              ),
                            ),
                          ],
                        )
                      else
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _buildPieChartCard(
                              pieMap,
                              colorList,
                              ordered,
                              overall,
                              getCategoryColor,
                            ),
                            const SizedBox(height: 20),
                            _buildStatsGrid(
                              width,
                              totalAmt,
                              totalDeds,
                              deductionRate,
                              totalTxs,
                              matchedTxs,
                              unmatchedTxs,
                              matchedPercent,
                              unmatchedPercent,
                            ),
                          ],
                        ),
                      const SizedBox(height: 32),
                      _buildBreakdownHeader(),
                      const SizedBox(height: 16),
                      _buildBreakdownTable(rows, getCategoryColor),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
