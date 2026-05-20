import 'package:booksmart/constant/exports.dart';
import 'package:booksmart/constant/data.dart';

import 'package:booksmart/widgets/custom_dialog.dart';
import 'package:booksmart/widgets/custom_drop_down.dart';
import 'package:booksmart/widgets/multiple_selection_dropdown_widget.dart';
import 'package:booksmart/widgets/snackbar.dart';
import 'package:booksmart/widgets/loading.dart';
import 'package:dropdown_search/dropdown_search.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import 'package:booksmart/modules/user/controllers/organization_controller.dart';
import 'business_details_widgets.dart';

void goToTaxStrategyOnboarding({
  int? organizationId,
  bool shouldCloseBefore = false,
}) {
  if (kIsWeb) {
    if (shouldCloseBefore) {
      Get.back();
    }
    customDialog(
      child: TaxStrategyOnboardingStepper(
        organizationId: organizationId,
      ),
      title: "Tax Strategy Onboarding",
      barrierDismissible: true,
    );
  } else {
    if (shouldCloseBefore) {
      Get.off(
        () => TaxStrategyOnboardingStepper(
          organizationId: organizationId,
        ),
      );
    } else {
      Get.to(
        () => TaxStrategyOnboardingStepper(
          organizationId: organizationId,
        ),
      );
    }
  }
}

class TaxStrategyOnboardingStepper extends StatefulWidget {
  final int? organizationId;
  const TaxStrategyOnboardingStepper({
    super.key,
    this.organizationId,
  });

  @override
  State<TaxStrategyOnboardingStepper> createState() =>
      _TaxStrategyOnboardingStepperState();
}

class _TaxStrategyOnboardingStepperState
    extends State<TaxStrategyOnboardingStepper> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  bool _isSaving = false;

  // Step 1 State
  final _stateController = TextEditingController();
  final _filingKey = GlobalKey<DropdownSearchState<String>>();
  final _residencyKey = GlobalKey<DropdownSearchState<String>>();
  String? _filingStatus;
  String? _residencyStatus;
  bool? _multiStateActivity;

  // Step 2 State
  final _industryController = TextEditingController();
  final _incomeKey = GlobalKey<DropdownSearchState<String>>();
  final _passiveKey = GlobalKey<DropdownSearchState<String>>();
  List<String> _primaryIncomeTypes = [];
  List<String> _passiveIncome = [];

  // Step 3 State
  final _teamKey = GlobalKey<DropdownSearchState<String>>();
  final _methodKey = GlobalKey<DropdownSearchState<String>>();
  List<String> _teamStructure = [];
  String? _accountingMethod;
  bool? _majorEquipment;

  // Step 4 State
  final _ownershipKey = GlobalKey<DropdownSearchState<String>>();
  final _usageKey = GlobalKey<DropdownSearchState<String>>();
  String? _vehicleOwnership;
  String? _vehicleUsage;
  bool? _vehicleOver6kLbs;

  // Step 5 State
  final _officeKey = GlobalKey<DropdownSearchState<String>>();
  final _homeKey = GlobalKey<DropdownSearchState<String>>();
  final _techKey = GlobalKey<DropdownSearchState<String>>();
  String? _homeOfficeType;
  String? _homeStatus;
  List<String> _techUsage = [];

  // Step 6 State
  final _realEstateKey = GlobalKey<DropdownSearchState<String>>();
  List<String> _realEstateInterests = [];
  bool? _hostsBusinessMeetings;

  // Step 7 State
  final _insuranceKey = GlobalKey<DropdownSearchState<String>>();
  final _savingsKey = GlobalKey<DropdownSearchState<String>>();
  final _educationKey = GlobalKey<DropdownSearchState<String>>();
  String? _healthInsurance;
  List<String> _healthSavings = [];
  List<String> _familyEducation = [];

  // Step 8 State
  final _goalKey = GlobalKey<DropdownSearchState<String>>();
  final _retirementKey = GlobalKey<DropdownSearchState<String>>();
  final _auditKey = GlobalKey<DropdownSearchState<String>>();
  String? _taxGoal;
  List<String> _retirementCurrent = [];
  String? _auditAppetite;

  @override
  void initState() {
    super.initState();
    _preFillData();
  }

  void _preFillData() {
    if (widget.organizationId != null) {
      final org = organizationControllerInstance.organizations.firstWhereOrNull(
        (e) => e.id == widget.organizationId,
      );
      if (org != null) {
        // Step 1
        _filingStatus = org.filingStatus;
        _stateController.text = org.primaryState ?? '';
        _residencyStatus = org.residencyStatus;
        _multiStateActivity = org.multiStateActivity;
        // Step 2
        _primaryIncomeTypes = org.primaryIncomeTypes ?? [];
        _industryController.text = org.industryNiche ?? '';
        _passiveIncome = org.passiveIncome ?? [];
        // Step 3
        _teamStructure = org.teamStructure ?? [];
        _accountingMethod = org.accountingMethod;
        _majorEquipment = org.majorEquipment;
        // Step 4
        _vehicleOwnership = org.vehicleOwnership;
        _vehicleUsage = org.vehicleUsage;
        _vehicleOver6kLbs = org.vehicleOver6kLbs;
        // Step 5
        _homeOfficeType = org.homeOfficeType;
        _homeStatus = org.homeStatus;
        _techUsage = org.techUsage ?? [];
        // Step 6
        _realEstateInterests = org.realEstateInterests ?? [];
        _hostsBusinessMeetings = org.hostsBusinessMeetings;
        // Step 7
        _healthInsurance = org.healthInsurance;
        _healthSavings = org.healthSavings ?? [];
        _familyEducation = org.familyEducation ?? [];
        // Step 8
        _taxGoal = org.taxGoal;
        _retirementCurrent = org.retirementCurrent ?? [];
        _auditAppetite = org.auditAppetite;
      }
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _stateController.dispose();
    _industryController.dispose();
    super.dispose();
  }

  Future<void> _saveAndNext() async {
    setState(() => _isSaving = true);
    showLoading();

    try {
      final Map<String, dynamic> data = {};

      switch (_currentStep) {
        case 0:
          data.addAll({
            'filing_status': _filingStatus,
            'primary_state': _stateController.text.trim().isEmpty
                ? null
                : _stateController.text.trim(),
            'residency_status': _residencyStatus,
            'multi_state_activity': _multiStateActivity,
          });
          break;
        case 1:
          data.addAll({
            'primary_income_types': _primaryIncomeTypes.isEmpty
                ? null
                : _primaryIncomeTypes,
            'industry_niche': _industryController.text.trim().isEmpty
                ? null
                : _industryController.text.trim(),
            'passive_income': _passiveIncome.isEmpty ? null : _passiveIncome,
          });
          break;
        case 2:
          data.addAll({
            'team_structure': _teamStructure.isEmpty ? null : _teamStructure,
            'accounting_method': _accountingMethod,
            'major_equipment': _majorEquipment,
          });
          break;
        case 3:
          data.addAll({
            'vehicle_ownership': _vehicleOwnership,
            'vehicle_usage': _vehicleUsage,
            'vehicle_over_6k_lbs': _vehicleOver6kLbs,
          });
          break;
        case 4:
          data.addAll({
            'home_office_type': _homeOfficeType,
            'home_status': _homeStatus,
            'tech_usage': _techUsage.isEmpty ? null : _techUsage,
          });
          break;
        case 5:
          data.addAll({
            'real_estate_interests': _realEstateInterests.isEmpty
                ? null
                : _realEstateInterests,
            'hosts_business_meetings': _hostsBusinessMeetings,
          });
          break;
        case 6:
          data.addAll({
            'health_insurance': _healthInsurance,
            'health_savings': _healthSavings.isEmpty ? null : _healthSavings,
            'family_education': _familyEducation.isEmpty
                ? null
                : _familyEducation,
          });
          break;
        case 7:
          data.addAll({
            'tax_goal': _taxGoal,
            'retirement_current': _retirementCurrent.isEmpty
                ? null
                : _retirementCurrent,
            'audit_appetite': _auditAppetite,
          });
          break;
      }

      if (widget.organizationId != null) {
        await organizationControllerInstance.updateTaxProfile(
          organizationId: widget.organizationId!,
          data: data,
        );
      }

      dismissLoadingWidget();
      setState(() => _isSaving = false);

      if (_currentStep < 7) {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
        setState(() => _currentStep++);
      } else {
        _finish();
      }
    } catch (e) {
      dismissLoadingWidget();
      setState(() => _isSaving = false);
      showSnackBar('Failed to save progress. Please try again.', isError: true);
    }
  }

  void _finish() {
    // Navigate back first to close the dialog/screen
    if (kIsWeb) {
      Get.back();
    } else {
      Get.until((route) => route.isFirst);
    }

    // Show success message after navigation
    showSnackBar('Tax profile saved! Your AI strategy is being tailored. 🎯');
  }

  void _nextWithoutSaving() {
    if (_currentStep < 7) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      setState(() => _currentStep++);
    } else {
      _finish();
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      //  backgroundColor: colorScheme.surface,
      appBar: kIsWeb
          ? null
          : AppBar(
              title: Text('Tax Strategy — Step ${_currentStep + 1} of 8'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  if (_currentStep > 0) {
                    _pageController.previousPage(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                    setState(() => _currentStep--);
                  } else {
                    Get.back();
                  }
                },
              ),
            ),
      body: Column(
        children: [
          if (kIsWeb)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () {
                      if (_currentStep > 0) {
                        _pageController.previousPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                        setState(() => _currentStep--);
                      } else {
                        Get.back();
                      }
                    },
                    icon: Icon(Icons.arrow_back, color: colorScheme.primary),
                  ),
                  const SizedBox(width: 8),
                  AppText(
                    'Step ${_currentStep + 1} of 8',
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Get.back(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildStep1(colorScheme),
                _buildStep2(colorScheme),
                _buildStep3(colorScheme),
                _buildStep4(colorScheme),
                _buildStep5(colorScheme),
                _buildStep6(colorScheme),
                _buildStep7(colorScheme),
                _buildStep8(colorScheme),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepWrapper({
    required int step,
    required String title,
    required String subtitle,
    required IconData icon,
    required List<Widget> children,
    String nextLabel = 'Save & Next',
    bool showSkip = true,
  }) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        TaxProgressBar(current: step),
        const SizedBox(height: 20),
        TaxSectionTitle(icon: icon, title: title, subtitle: subtitle),
        const SizedBox(height: 24),
        ...children,
        const SizedBox(height: 32),
        TaxNavButtons(
          onSkip: _nextWithoutSaving,
          onNext: _saveAndNext,
          nextLabel: nextLabel,
          showSkip: showSkip,
          isLoading: _isSaving,
        ),
      ],
    );
  }

  // --- STEP BUILDERS ---

  Widget _buildStep1(ColorScheme colorScheme) {
    return _buildStepWrapper(
      step: 1,
      icon: Icons.gavel_rounded,
      title: 'Legal & Tax Identity',
      subtitle:
          'Help us understand your legal standing to optimize your strategy.',
      children: [
        AppText('Filing Status', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _filingKey,
          hint: 'Select filing status',
          items: filingStatusOptions,
          selectedItem: _filingStatus,
          onChanged: (v) => setState(() => _filingStatus = v),
        ),
        const SizedBox(height: 16),
        AppText('Primary State', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 8),
        AppTextField(
          controller: _stateController,
          hintText: 'e.g. California, Texas',
          maxLines: 1,
        ),
        const SizedBox(height: 16),
        AppText('Residency Status', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _residencyKey,
          hint: 'Select residency status',
          items: residencyStatusOptions,
          selectedItem: _residencyStatus,
          onChanged: (v) => setState(() => _residencyStatus = v),
        ),
        const SizedBox(height: 16),
        AppText(
          'Multi-State Activity',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 4),
        AppText(
          'Did you work or own property in more than one state?',
          fontSize: 13,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        YesNoToggle(
          value: _multiStateActivity,
          onChanged: (v) => setState(() => _multiStateActivity = v),
        ),
      ],
    );
  }

  Widget _buildStep2(ColorScheme colorScheme) {
    return _buildStepWrapper(
      step: 2,
      icon: Icons.account_balance_wallet_rounded,
      title: 'Income Streams & Entity Structure',
      subtitle: 'Tell us how you earn to unlock entity-level strategies.',
      children: [
        AppText(
          'Primary Income Type',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 4),
        AppText(
          'Select all that apply',
          fontSize: 12,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        CustomMultiDropDownWidget<String>(
          dropDownKey: _incomeKey,
          hint: 'Select income types',
          items: incomeTypeOptions,
          selectedItems: _primaryIncomeTypes,
          onChanged: (v) => setState(() => _primaryIncomeTypes = v),
        ),
        const SizedBox(height: 16),
        AppText('Industry / Niche', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 8),
        AppTextField(
          controller: _industryController,
          hintText: 'e.g. Software, Construction, Real Estate',
          maxLines: 1,
        ),
        const SizedBox(height: 16),
        AppText('Passive Income', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 4),
        AppText(
          'Select all that apply',
          fontSize: 12,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        CustomMultiDropDownWidget<String>(
          dropDownKey: _passiveKey,
          hint: 'Select passive income sources',
          items: passiveIncomeOptions,
          selectedItems: _passiveIncome,
          onChanged: (v) => setState(() => _passiveIncome = v),
        ),
      ],
    );
  }

  Widget _buildStep3(ColorScheme colorScheme) {
    return _buildStepWrapper(
      step: 3,
      icon: Icons.business_center_rounded,
      title: 'Operational Footprint',
      subtitle:
          'Audit-proof your business by documenting your team & accounting setup.',
      children: [
        AppText('Team & Payroll', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 4),
        AppText(
          'Select all that apply',
          fontSize: 12,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        CustomMultiDropDownWidget<String>(
          dropDownKey: _teamKey,
          hint: 'Select team structure',
          items: teamStructureOptions,
          selectedItems: _teamStructure,
          onChanged: (v) => setState(() => _teamStructure = v),
        ),
        const SizedBox(height: 16),
        AppText('Accounting Method', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _methodKey,
          hint: 'Select accounting method',
          items: accountingMethodOptions,
          selectedItem: _accountingMethod,
          onChanged: (v) => setState(() => _accountingMethod = v),
        ),
        const SizedBox(height: 16),
        AppText('Major Equipment', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 4),
        AppText(
          'Did you purchase machinery, heavy tech, or equipment over \$2,500 this year?',
          fontSize: 13,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        YesNoToggle(
          value: _majorEquipment,
          onChanged: (v) => setState(() => _majorEquipment = v),
        ),
        const TaxInsightChip(
          text:
              'AI Insight: This triggers Section 179 or Bonus Depreciation strategies.',
        ),
      ],
    );
  }

  Widget _buildStep4(ColorScheme colorScheme) {
    return _buildStepWrapper(
      step: 4,
      icon: Icons.directions_car_rounded,
      title: 'Vehicle & Logistics',
      subtitle:
          "Vehicle deductions can be significant — let's capture every dollar.",
      children: [
        AppText('Vehicle Ownership', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _ownershipKey,
          hint: 'Select ownership type',
          items: vehicleOwnershipOptions,
          selectedItem: _vehicleOwnership,
          onChanged: (v) => setState(() => _vehicleOwnership = v),
        ),
        const SizedBox(height: 16),
        AppText(
          'Primary Usage Method',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _usageKey,
          hint: 'Select usage method',
          items: vehicleUsageOptions,
          selectedItem: _vehicleUsage,
          onChanged: (v) => setState(() => _vehicleUsage = v),
        ),
        const SizedBox(height: 16),
        AppText('Vehicle Weight', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 4),
        AppText(
          'Is the vehicle over 6,000 lbs? (SUV/Truck)',
          fontSize: 13,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        YesNoToggle(
          value: _vehicleOver6kLbs,
          onChanged: (v) => setState(() => _vehicleOver6kLbs = v),
        ),
        const TaxInsightChip(
          text:
              'AI Insight: This triggers the "Hummer Tax Loophole" — heavy vehicle depreciation under Section 179.',
        ),
      ],
    );
  }

  Widget _buildStep5(ColorScheme colorScheme) {
    return _buildStepWrapper(
      step: 5,
      icon: Icons.home_work_rounded,
      title: 'Workspace & Infrastructure',
      subtitle: 'Your home office and tech setup could be fully deductible.',
      children: [
        AppText('Home Office Setup', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _officeKey,
          hint: 'Select home office type',
          items: homeOfficeTypeOptions,
          selectedItem: _homeOfficeType,
          onChanged: (v) => setState(() => _homeOfficeType = v),
        ),
        const SizedBox(height: 16),
        AppText(
          'Home Ownership Status',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _homeKey,
          hint: 'Select home status',
          items: homeStatusOptions,
          selectedItem: _homeStatus,
          onChanged: (v) => setState(() => _homeStatus = v),
        ),
        const SizedBox(height: 16),
        AppText(
          'Tech & Digital Usage',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 4),
        AppText(
          'Select all that apply',
          fontSize: 12,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        CustomMultiDropDownWidget<String>(
          dropDownKey: _techKey,
          hint: 'Select tech usage',
          items: techUsageOptions,
          selectedItems: _techUsage,
          onChanged: (v) => setState(() => _techUsage = v),
        ),
      ],
    );
  }

  Widget _buildStep6(ColorScheme colorScheme) {
    return _buildStepWrapper(
      step: 6,
      icon: Icons.house_rounded,
      title: 'Real Estate Strategy',
      subtitle:
          'Real estate holds some of the most powerful tax strategies available.',
      children: [
        AppText(
          'Real Estate Interests',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 4),
        AppText(
          'Select all that apply',
          fontSize: 12,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        CustomMultiDropDownWidget<String>(
          dropDownKey: _realEstateKey,
          hint: 'Select real estate interests',
          items: realEstateInterestOptions,
          selectedItems: _realEstateInterests,
          onChanged: (v) => setState(() => _realEstateInterests = v),
        ),
        const SizedBox(height: 16),
        AppText('Meeting Strategy', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 4),
        AppText(
          'Do you host business meetings or "Corporate Minutes" at your home?',
          fontSize: 13,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        YesNoToggle(
          value: _hostsBusinessMeetings,
          onChanged: (v) => setState(() => _hostsBusinessMeetings = v),
        ),
        const TaxInsightChip(
          text:
              'AI Insight: This identifies eligibility for the Augusta Rule — up to 14 days of tax-free rental income from your home.',
        ),
      ],
    );
  }

  Widget _buildStep7(ColorScheme colorScheme) {
    return _buildStepWrapper(
      step: 7,
      icon: Icons.favorite_rounded,
      title: 'Household & Benefits',
      subtitle:
          'Health and family expenses often hide significant tax opportunities.',
      children: [
        AppText(
          'Health Insurance Type',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _insuranceKey,
          hint: 'Select health insurance type',
          items: healthInsuranceOptions,
          selectedItem: _healthInsurance,
          onChanged: (v) => setState(() => _healthInsurance = v),
        ),
        const SizedBox(height: 16),
        AppText('Health Savings', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 4),
        AppText(
          'Select all that apply',
          fontSize: 12,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        CustomMultiDropDownWidget<String>(
          dropDownKey: _savingsKey,
          hint: 'Select health savings accounts',
          items: healthSavingsOptions,
          selectedItems: _healthSavings,
          onChanged: (v) => setState(() => _healthSavings = v),
        ),
        const SizedBox(height: 16),
        AppText(
          'Education & Family',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 4),
        AppText(
          'Select all that apply',
          fontSize: 12,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        CustomMultiDropDownWidget<String>(
          dropDownKey: _educationKey,
          hint: 'Select education & family expenses',
          items: familyEducationOptions,
          selectedItems: _familyEducation,
          onChanged: (v) => setState(() => _familyEducation = v),
        ),
      ],
    );
  }

  Widget _buildStep8(ColorScheme colorScheme) {
    return _buildStepWrapper(
      step: 8,
      icon: Icons.auto_awesome_rounded,
      title: 'AI Strategy Alignment',
      subtitle:
          'Final step — align your goals so our AI can build your personalized roadmap.',
      nextLabel: 'Save & Finish 🎯',
      showSkip: false, // REMOVE SKIP from the last screen
      children: [
        AppText('Primary Tax Goal', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _goalKey,
          hint: 'Select your primary goal',
          items: taxGoalOptions,
          selectedItem: _taxGoal,
          onChanged: (v) => setState(() => _taxGoal = v),
        ),
        const SizedBox(height: 16),
        AppText(
          'Retirement Readiness',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 4),
        AppText(
          'Select all that apply',
          fontSize: 12,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 8),
        CustomMultiDropDownWidget<String>(
          dropDownKey: _retirementKey,
          hint: 'Select retirement plans',
          items: retirementCurrentOptions,
          selectedItems: _retirementCurrent,
          onChanged: (v) => setState(() => _retirementCurrent = v),
        ),
        const SizedBox(height: 16),
        AppText('Audit Appetite', fontSize: 14, fontWeight: FontWeight.w600),
        const SizedBox(height: 8),
        CustomDropDownWidget<String>(
          dropDownKey: _auditKey,
          hint: 'Select your risk tolerance',
          items: auditAppetiteOptions,
          selectedItem: _auditAppetite,
          onChanged: (v) => setState(() => _auditAppetite = v),
        ),
        const SizedBox(height: 32),
        // Completion Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                colorScheme.primary.withValues(alpha: 0.15),
                colorScheme.secondary.withValues(alpha: 0.10),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: colorScheme.primary.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.celebration_rounded,
                color: colorScheme.primary,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppText(
                      'Almost there!',
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                    ),
                    const SizedBox(height: 2),
                    AppText(
                      'Once you finish, our AI will generate your personalized US tax strategy.',
                      fontSize: 12,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
