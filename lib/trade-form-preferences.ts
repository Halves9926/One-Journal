export type TradeFieldKey =
  | 'trade_date'
  | 'symbol'
  | 'direction'
  | 'entry_price'
  | 'stop_loss'
  | 'take_profit'
  | 'risk_amount'
  | 'position_size'
  | 'pnl'
  | 'rr'
  | 'strategy'
  | 'session'
  | 'mistake'
  | 'notes'
  | 'screenshot_url';

export type TradeFieldSectionKey = 'setup' | 'risk' | 'review';

export type TradeFieldPreferences = Record<TradeFieldKey, boolean>;

export type TradeFieldDefinition = {
  control: 'checkbox' | 'input' | 'select' | 'textarea';
  defaultEnabled: boolean;
  description: string;
  key: TradeFieldKey;
  label: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
  persistsToSupabase: boolean;
  placeholder?: string;
  requiredWhenVisible: boolean;
  section: TradeFieldSectionKey;
  step?: string;
  type?: 'date' | 'number' | 'text' | 'url';
};

export const TRADE_FIELD_SECTIONS: Array<{
  description: string;
  key: TradeFieldSectionKey;
  label: string;
}> = [
  {
    key: 'setup',
    label: 'Setup',
    description: 'Core execution inputs.',
  },
  {
    key: 'risk',
    label: 'Risk',
    description: 'Sizing, RR and outcome.',
  },
  {
    key: 'review',
    label: 'Review',
    description: 'Context and notes.',
  },
];

export const TRADE_FIELD_DEFINITIONS: TradeFieldDefinition[] = [
  {
    key: 'trade_date',
    label: 'Date',
    description: 'Trade date.',
    section: 'setup',
    control: 'input',
    type: 'date',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: true,
  },
  {
    key: 'symbol',
    label: 'Symbol',
    description: 'Instrument ticker.',
    section: 'setup',
    control: 'input',
    type: 'text',
    placeholder: 'BTCUSD, ES, AAPL',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: true,
  },
  {
    key: 'direction',
    label: 'Direction',
    description: 'Long or short.',
    section: 'setup',
    control: 'select',
    options: [
      { label: 'Long', value: 'Long' },
      { label: 'Short', value: 'Short' },
    ],
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: true,
  },
  {
    key: 'strategy',
    label: 'Strategy',
    description: 'Execution setup tag.',
    section: 'setup',
    control: 'input',
    type: 'text',
    placeholder: 'Breakout, mean reversion',
    defaultEnabled: false,
    persistsToSupabase: false,
    requiredWhenVisible: true,
  },
  {
    key: 'session',
    label: 'Session',
    description: 'Market session.',
    section: 'setup',
    control: 'input',
    type: 'text',
    placeholder: 'London, New York',
    defaultEnabled: false,
    persistsToSupabase: false,
    requiredWhenVisible: true,
  },
  {
    key: 'entry_price',
    label: 'Entry',
    description: 'Entry price.',
    section: 'risk',
    control: 'input',
    type: 'number',
    step: 'any',
    placeholder: '0.00',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: true,
  },
  {
    key: 'stop_loss',
    label: 'Stop Loss',
    description: 'Invalidation price.',
    section: 'risk',
    control: 'input',
    type: 'number',
    step: 'any',
    placeholder: '0.00',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: true,
  },
  {
    key: 'take_profit',
    label: 'Take Profit',
    description: 'Target price.',
    section: 'risk',
    control: 'input',
    type: 'number',
    step: 'any',
    placeholder: '0.00',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: true,
  },
  {
    key: 'risk_amount',
    label: 'Risk %',
    description: 'Risk allocation.',
    section: 'risk',
    control: 'input',
    type: 'number',
    step: 'any',
    placeholder: '0.00',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: true,
  },
  {
    key: 'position_size',
    label: 'Position Size',
    description: 'Size or contracts.',
    section: 'risk',
    control: 'input',
    type: 'number',
    step: 'any',
    placeholder: '0.00',
    defaultEnabled: false,
    persistsToSupabase: false,
    requiredWhenVisible: true,
  },
  {
    key: 'rr',
    label: 'RR',
    description: 'Risk reward.',
    section: 'risk',
    control: 'input',
    type: 'number',
    step: 'any',
    placeholder: '0.00',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: true,
  },
  {
    key: 'pnl',
    label: 'PnL',
    description: 'Result.',
    section: 'risk',
    control: 'input',
    type: 'number',
    step: 'any',
    placeholder: '0.00',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: true,
  },
  {
    key: 'mistake',
    label: 'Mistake',
    description: 'Execution quality.',
    section: 'review',
    control: 'select',
    options: [
      { label: 'No', value: 'No' },
      { label: 'Yes', value: 'Yes' },
    ],
    defaultEnabled: false,
    persistsToSupabase: false,
    requiredWhenVisible: true,
  },
  {
    key: 'notes',
    label: 'Notes',
    description: 'Execution review.',
    section: 'review',
    control: 'textarea',
    placeholder: 'Execution, context, review...',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: false,
  },
  {
    key: 'screenshot_url',
    label: 'Screenshot URL',
    description: 'Chart reference.',
    section: 'review',
    control: 'input',
    type: 'url',
    placeholder: 'https://...',
    defaultEnabled: true,
    persistsToSupabase: true,
    requiredWhenVisible: false,
  },
];

export const DEFAULT_TRADE_FIELD_PREFERENCES = TRADE_FIELD_DEFINITIONS.reduce<TradeFieldPreferences>(
  (accumulator, field) => {
    accumulator[field.key] = field.defaultEnabled;
    return accumulator;
  },
  {
    trade_date: true,
    symbol: true,
    direction: true,
    entry_price: true,
    stop_loss: true,
    take_profit: true,
    risk_amount: true,
    position_size: false,
    pnl: true,
    rr: true,
    strategy: false,
    session: false,
    mistake: false,
    notes: true,
    screenshot_url: true,
  },
);

export const TRADE_FIELD_DEFINITION_MAP = TRADE_FIELD_DEFINITIONS.reduce<
  Record<TradeFieldKey, TradeFieldDefinition>
>((accumulator, field) => {
  accumulator[field.key] = field;
  return accumulator;
}, {} as Record<TradeFieldKey, TradeFieldDefinition>);

export const TRADE_PREFERENCES_STORAGE_KEY =
  'one-journal.trade-form-preferences.v1';

export function mergeTradeFieldPreferences(
  value: unknown,
): TradeFieldPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_TRADE_FIELD_PREFERENCES };
  }

  const candidate = value as Record<string, unknown>;
  const nextPreferences = { ...DEFAULT_TRADE_FIELD_PREFERENCES };

  for (const field of TRADE_FIELD_DEFINITIONS) {
    const candidateValue = candidate[field.key];

    if (typeof candidateValue === 'boolean') {
      nextPreferences[field.key] = candidateValue;
    }
  }

  return nextPreferences;
}
