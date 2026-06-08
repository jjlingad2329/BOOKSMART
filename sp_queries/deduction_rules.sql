create table deduction_rule_groups (
    id bigint generated always as identity primary key,
    state_id bigint null,
    valid_from date not null,
    valid_to date null,
    description text null,
    created_at timestamptz not null default now(),

    constraint chk_valid_range check (valid_to is null or valid_to > valid_from)
);

create table deduction_rules (
    id bigint generated always as identity primary key,
    deduction_rule_group_id bigint not null
        references deduction_rule_groups(id),
    sub_category_id bigint not null,

    calculation_type text null,                 -- 'fixed' | 'percentage'
    value numeric null,
    organization_column_name text null,
    is_per_transaction boolean not null default false,
    max_deduction_per_transaction numeric null,

    created_at timestamptz not null default now(),

    unique (deduction_rule_group_id, sub_category_id),

    -- if organization_column_name is set, value must be empty (and vice versa)
    constraint chk_rule_fields check (
        (organization_column_name is not null and value is null and calculation_type is null)
        or
        (organization_column_name is null and value is not null and calculation_type is not null)
    ),

    constraint chk_max_per_transaction check (
        max_deduction_per_transaction is null or is_per_transaction = true
    )
);