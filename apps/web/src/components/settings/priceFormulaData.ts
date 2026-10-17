export type FormulaValueKey =
  | "number"
  | "cost"
  | "currentPrice"
  | "categoryRate"
  | "deliveryFee"
  | "paymentRate"
  | `custom:${string}`
  | `step:${string}`;

export type FormulaOperationType =
  | "add"
  | "subtract"
  | "increasePercent"
  | "decreasePercent"
  | "addValuePercent"
  | "addExpenses"
  | "multiply"
  | "divide";

export interface FormulaOperand {
  source: FormulaValueKey;
  value: string;
}

export interface FormulaOperation {
  id: string;
  type: FormulaOperationType;
  operand: FormulaOperand;
  baseSource: FormulaValueKey;
}

export interface FormulaStep {
  id: string;
  start: FormulaOperand;
  operations: FormulaOperation[];
}

export interface FormulaVariable {
  id: string;
  name: string;
  kind: "percent" | "amount";
  value: string;
  expense: boolean;
}

export interface FormulaPayment {
  id: string;
  name: string;
  percentage: string;
  selected: boolean;
  installment: boolean;
}

export interface PriceFormulaConfiguration {
  version: 1;
  builtInExpenses: {
    categoryRate: boolean;
    deliveryFee: boolean;
    paymentRate: boolean;
  };
  variables: FormulaVariable[];
  payments: FormulaPayment[];
  steps: FormulaStep[];
}

export interface FormulaSample {
  cost: number;
  currentPrice: number;
  categoryRate: number;
  deliveryFee: number;
}

export interface ExpenseSummary {
  total: number;
  percentageRate: number;
  fixedAmount: number;
}

export interface StepOperationEvaluation {
  before: number;
  after: number;
  summary: string;
  token: string;
}

export interface StepEvaluation {
  id: string;
  result: number;
  startValue: number;
  startLabel: string;
  operationResults: StepOperationEvaluation[];
  formula: string;
}

export const DELIVERY_FEE_SAMPLE = 5;

export const OPERATION_LABELS: Record<FormulaOperationType, string> = {
  add: "Əlavə et",
  subtract: "Çıx",
  increasePercent: "Faiz qədər artır",
  decreasePercent: "Faiz qədər azalt",
  addValuePercent: "Başqa dəyərin faizini əlavə et",
  addExpenses: "Xərcləri üstünə gəl",
  multiply: "Vur",
  divide: "Böl"
};

export const OPERATION_HELP: Record<FormulaOperationType, string> = {
  add: "nəticəyə əlavə olunur",
  subtract: "nəticədən çıxılır",
  increasePercent: "nəticə bu faiz qədər artır (100 + 10% = 110)",
  decreasePercent: "nəticə bu faiz qədər azalır (100 − 10% = 90)",
  addValuePercent: "seçilən dəyərin bu faizi əlavə olunur (məs. + Mayanın 70%-i)",
  addExpenses: "“Satışdan tutulur” işarələnmiş dəyərlər qədər qiymət qaldırılır",
  multiply: "nəticə bu ədədə vurulur",
  divide: "nəticə bu ədədə bölünür"
};

export function priceFormulaStorageKey(storeId: string | undefined) {
  return `emoli:price-formula:${storeId || "local-store"}`;
}

export function createEmptyPriceFormula(): PriceFormulaConfiguration {
  return {
    version: 1,
    builtInExpenses: { categoryRate: false, deliveryFee: false, paymentRate: false },
    variables: [],
    payments: [],
    steps: []
  };
}

export function createLocalFormulaId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const operationTypes = new Set<FormulaOperationType>([
  "add",
  "subtract",
  "increasePercent",
  "decreasePercent",
  "addValuePercent",
  "addExpenses",
  "multiply",
  "divide"
]);

function isValueKey(value: unknown): value is FormulaValueKey {
  return typeof value === "string" && (
    ["number", "cost", "currentPrice", "categoryRate", "deliveryFee", "paymentRate"].includes(value)
    || value.startsWith("custom:")
    || value.startsWith("step:")
  );
}

function parseOperand(value: unknown, fallback: FormulaOperand): FormulaOperand {
  if (!value || typeof value !== "object") return fallback;
  const operand = value as Partial<FormulaOperand>;
  return {
    source: isValueKey(operand.source) ? operand.source : fallback.source,
    value: typeof operand.value === "string" ? operand.value : fallback.value
  };
}

export function parsePriceFormula(value: string | null): PriceFormulaConfiguration {
  if (!value) return createEmptyPriceFormula();
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return createEmptyPriceFormula();
    const record = parsed as Partial<PriceFormulaConfiguration>;
    const expenses = record.builtInExpenses;
    const variables = Array.isArray(record.variables) ? record.variables.flatMap((entry): FormulaVariable[] => {
      if (!entry || typeof entry !== "object") return [];
      const variable = entry as Partial<FormulaVariable>;
      if (typeof variable.id !== "string") return [];
      return [{
        id: variable.id,
        name: typeof variable.name === "string" ? variable.name : "",
        kind: variable.kind === "amount" ? "amount" : "percent",
        value: typeof variable.value === "string" ? variable.value : "0",
        expense: variable.expense === true
      }];
    }) : [];
    const payments = Array.isArray(record.payments) ? record.payments.flatMap((entry): FormulaPayment[] => {
      if (!entry || typeof entry !== "object") return [];
      const payment = entry as Partial<FormulaPayment>;
      if (typeof payment.id !== "string") return [];
      return [{
        id: payment.id,
        name: typeof payment.name === "string" ? payment.name : "",
        percentage: typeof payment.percentage === "string" ? payment.percentage : "0",
        selected: payment.selected === true,
        installment: payment.installment === true
      }];
    }) : [];
    const steps = Array.isArray(record.steps) ? record.steps.flatMap((entry): FormulaStep[] => {
      if (!entry || typeof entry !== "object") return [];
      const step = entry as Partial<FormulaStep>;
      if (typeof step.id !== "string") return [];
      const operations = Array.isArray(step.operations) ? step.operations.flatMap((operationEntry): FormulaOperation[] => {
        if (!operationEntry || typeof operationEntry !== "object") return [];
        const operation = operationEntry as Partial<FormulaOperation>;
        if (typeof operation.id !== "string" || !operationTypes.has(operation.type as FormulaOperationType)) return [];
        return [{
          id: operation.id,
          type: operation.type as FormulaOperationType,
          operand: parseOperand(operation.operand, { source: "number", value: "0" }),
          baseSource: isValueKey(operation.baseSource) ? operation.baseSource : "cost"
        }];
      }) : [];
      return [{
        id: step.id,
        start: parseOperand(step.start, { source: "cost", value: "100" }),
        operations
      }];
    }) : [];
    return {
      version: 1,
      builtInExpenses: {
        categoryRate: expenses?.categoryRate === true,
        deliveryFee: expenses?.deliveryFee === true,
        paymentRate: expenses?.paymentRate === true
      },
      variables,
      payments,
      steps
    };
  } catch {
    return createEmptyPriceFormula();
  }
}

export function numericFormulaValue(value: string | number) {
  const normalized = typeof value === "number" ? value : Number(value.trim().replace(",", "."));
  return Number.isFinite(normalized) ? normalized : 0;
}

export function formatFormulaNumber(value: number) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return rounded.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function selectedPaymentRate(payments: readonly FormulaPayment[]) {
  return payments.reduce((total, payment) => payment.selected ? total + numericFormulaValue(payment.percentage) : total, 0);
}

export function togglePaymentSelection(payments: readonly FormulaPayment[], id: string): FormulaPayment[] {
  const target = payments.find((payment) => payment.id === id);
  if (!target) return [...payments];
  const nextSelected = !target.selected;
  return payments.map((payment) => {
    if (payment.id === id) return { ...payment, selected: nextSelected };
    if (nextSelected && target.installment && payment.installment) return { ...payment, selected: false };
    return payment;
  });
}

export function calculateExpenses(config: PriceFormulaConfiguration, sample: FormulaSample): ExpenseSummary {
  let total = 0;
  let percentageRate = 0;
  let fixedAmount = 0;
  if (config.builtInExpenses.categoryRate) {
    percentageRate += sample.categoryRate;
    total += sample.currentPrice * sample.categoryRate / 100;
  }
  if (config.builtInExpenses.deliveryFee) {
    fixedAmount += sample.deliveryFee;
    total += sample.deliveryFee;
  }
  if (config.builtInExpenses.paymentRate) {
    const rate = selectedPaymentRate(config.payments);
    percentageRate += rate;
    total += sample.currentPrice * rate / 100;
  }
  for (const variable of config.variables) {
    if (!variable.expense) continue;
    const value = numericFormulaValue(variable.value);
    if (variable.kind === "percent") {
      percentageRate += value;
      total += sample.currentPrice * value / 100;
    } else {
      fixedAmount += value;
      total += value;
    }
  }
  return { total, percentageRate, fixedAmount };
}

function customVariable(config: PriceFormulaConfiguration, key: FormulaValueKey) {
  return key.startsWith("custom:") ? config.variables.find((variable) => variable.id === key.slice(7)) : undefined;
}

export function formulaValueLabel(key: FormulaValueKey, config: PriceFormulaConfiguration, sample: FormulaSample, stepNumberById = new Map<string, number>()) {
  if (key === "number") return "Rəqəm";
  if (key === "cost") return `Maya (${formatFormulaNumber(sample.cost)} ₼)`;
  if (key === "currentPrice") return `Hazırki qiymət (${formatFormulaNumber(sample.currentPrice)} ₼)`;
  if (key === "categoryRate") return `Kateqoriya faizi (${formatFormulaNumber(sample.categoryRate)}%)`;
  if (key === "deliveryFee") return "Çatdırılma haqqı (qiymətə görə)";
  if (key === "paymentRate") {
    const rate = selectedPaymentRate(config.payments);
    return `Ödəniş faizi (${config.payments.length === 0 ? "—" : `${formatFormulaNumber(rate)}%`})`;
  }
  if (key.startsWith("custom:")) {
    const variable = customVariable(config, key);
    return variable?.name.trim() || "Adsız dəyişən";
  }
  const stepNumber = stepNumberById.get(key.slice(5));
  return stepNumber ? `Addım ${stepNumber} nəticəsi` : "Addım nəticəsi";
}

function resolveFormulaValue(
  operand: FormulaOperand,
  config: PriceFormulaConfiguration,
  sample: FormulaSample,
  stepValues: ReadonlyMap<string, number>
) {
  if (operand.source === "number") return numericFormulaValue(operand.value);
  if (operand.source === "cost") return sample.cost;
  if (operand.source === "currentPrice") return sample.currentPrice;
  if (operand.source === "categoryRate") return sample.categoryRate;
  if (operand.source === "deliveryFee") return sample.deliveryFee;
  if (operand.source === "paymentRate") return selectedPaymentRate(config.payments);
  if (operand.source.startsWith("custom:")) return numericFormulaValue(customVariable(config, operand.source)?.value ?? "0");
  return stepValues.get(operand.source.slice(5)) ?? 0;
}

function shortValueLabel(operand: FormulaOperand, config: PriceFormulaConfiguration, sample: FormulaSample, stepNumberById: Map<string, number>) {
  if (operand.source === "number") return formatFormulaNumber(numericFormulaValue(operand.value));
  if (operand.source === "cost") return "Maya";
  if (operand.source === "currentPrice") return "Hazırki qiymət";
  if (operand.source === "categoryRate") return "Kateqoriya faizi";
  if (operand.source === "deliveryFee") return "Çatdırılma haqqı";
  if (operand.source === "paymentRate") return "Ödəniş faizi";
  return formulaValueLabel(operand.source, config, sample, stepNumberById);
}

export function evaluateFormulaSteps(config: PriceFormulaConfiguration, sample: FormulaSample): StepEvaluation[] {
  const stepValues = new Map<string, number>();
  const stepNumberById = new Map(config.steps.map((step, index) => [step.id, index + 1]));
  const expenses = calculateExpenses(config, sample);
  return config.steps.map((step) => {
    let result = resolveFormulaValue(step.start, config, sample, stepValues);
    const startValue = result;
    const operationResults = step.operations.map((operation): StepOperationEvaluation => {
      const before = result;
      const operand = resolveFormulaValue(operation.operand, config, sample, stepValues);
      const operandLabel = operation.operand.source === "number"
        ? formatFormulaNumber(operand)
        : formulaValueLabel(operation.operand.source, config, sample, stepNumberById);
      let token = "";
      switch (operation.type) {
        case "add":
          result += operand;
          token = `+ ${operandLabel}`;
          break;
        case "subtract":
          result -= operand;
          token = `− ${operandLabel}`;
          break;
        case "increasePercent":
          result += result * operand / 100;
          token = `+ ${formatFormulaNumber(operand)}%`;
          break;
        case "decreasePercent":
          result -= result * operand / 100;
          token = `− ${formatFormulaNumber(operand)}%`;
          break;
        case "addValuePercent": {
          const baseOperand: FormulaOperand = { source: operation.baseSource, value: "0" };
          const base = resolveFormulaValue(baseOperand, config, sample, stepValues);
          const baseLabel = formulaValueLabel(operation.baseSource, config, sample, stepNumberById);
          result += base * operand / 100;
          token = `+ ${baseLabel} × ${formatFormulaNumber(operand)}%`;
          break;
        }
        case "addExpenses": {
          const divisor = 1 - expenses.percentageRate / 100;
          result = divisor > 0 ? result / divisor + expenses.fixedAmount : result;
          token = "+ Xərclər";
          break;
        }
        case "multiply":
          result *= operand;
          token = `× ${operandLabel}`;
          break;
        case "divide":
          result = operand === 0 ? result : result / operand;
          token = `÷ ${operandLabel}`;
          break;
      }
      const symbol = operation.type === "subtract" || operation.type === "decreasePercent" ? "−" : operation.type === "multiply" ? "×" : operation.type === "divide" ? "÷" : "+";
      const summary = operation.type === "addValuePercent"
        ? `${formatFormulaNumber(before)} ₼ + ${formulaValueLabel(operation.baseSource, config, sample, stepNumberById)} × ${formatFormulaNumber(operand)}% = ${formatFormulaNumber(result)} ₼`
        : operation.type === "increasePercent" || operation.type === "decreasePercent"
          ? `${formatFormulaNumber(before)} ₼ ${symbol} ${formatFormulaNumber(operand)}% = ${formatFormulaNumber(result)} ₼`
          : operation.type === "addExpenses"
            ? `${formatFormulaNumber(before)} ₼ + satış xərcləri = ${formatFormulaNumber(result)} ₼`
            : `${formatFormulaNumber(before)} ₼ ${symbol} ${formatFormulaNumber(operand)} = ${formatFormulaNumber(result)} ₼`;
      return { before, after: result, summary, token };
    });
    stepValues.set(step.id, result);
    const startLabel = shortValueLabel(step.start, config, sample, stepNumberById);
    return {
      id: step.id,
      result,
      startValue,
      startLabel,
      operationResults,
      formula: [startLabel, ...operationResults.map((operation) => operation.token)].join(" ")
    };
  });
}

export function validatePriceFormula(config: PriceFormulaConfiguration) {
  const errors: string[] = [];
  const variableIds = new Set(config.variables.map((variable) => variable.id));
  const stepIndexes = new Map(config.steps.map((step, index) => [step.id, index]));
  const valueExists = (key: FormulaValueKey, currentStepIndex: number) => {
    if (key.startsWith("custom:")) return variableIds.has(key.slice(7));
    if (key.startsWith("step:")) {
      const referencedIndex = stepIndexes.get(key.slice(5));
      return referencedIndex !== undefined && referencedIndex < currentStepIndex;
    }
    return true;
  };
  for (const variable of config.variables) {
    if (!variable.name.trim()) errors.push("Dəyişənin adı boşdur");
    if (!variable.value.trim() || !Number.isFinite(Number(variable.value.replace(",", ".")))) errors.push(`${variable.name.trim() || "Dəyişən"} üçün dəyər düzgün deyil`);
  }
  for (const payment of config.payments) {
    if (!payment.name.trim()) errors.push("Ödəniş növünün adı boşdur");
    if (!payment.percentage.trim() || !Number.isFinite(Number(payment.percentage.replace(",", ".")))) errors.push(`${payment.name.trim() || "Ödəniş növü"} üçün faiz düzgün deyil`);
  }
  for (const [stepIndex, step] of config.steps.entries()) {
    if (!valueExists(step.start.source, stepIndex)) errors.push(`Addım ${stepIndex + 1} üçün seçilmiş başlanğıc dəyər mövcud deyil`);
    if (step.start.source === "number" && !step.start.value.trim()) errors.push(`Addım ${stepIndex + 1} üçün başlanğıc rəqəm boşdur`);
    for (const operation of step.operations) {
      if (operation.type !== "addExpenses" && !valueExists(operation.operand.source, stepIndex)) {
        errors.push(`Addım ${stepIndex + 1} əməliyyatında seçilmiş dəyər mövcud deyil`);
      }
      if (operation.type === "addValuePercent" && !valueExists(operation.baseSource, stepIndex)) {
        errors.push(`Addım ${stepIndex + 1} əməliyyatında faiz dəyəri mövcud deyil`);
      }
      if (operation.type !== "addExpenses" && operation.operand.source === "number" && !operation.operand.value.trim()) {
        errors.push(`Addım ${stepIndex + 1} əməliyyatında dəyər boşdur`);
      }
      if (operation.type === "divide" && numericFormulaValue(operation.operand.value) === 0 && operation.operand.source === "number") {
        errors.push(`Addım ${stepIndex + 1}: sıfıra bölmək olmaz`);
      }
    }
  }
  return [...new Set(errors)];
}

export function hasFormulaContent(config: PriceFormulaConfiguration) {
  return config.steps.length > 0
    || config.builtInExpenses.categoryRate
    || config.builtInExpenses.deliveryFee
    || config.builtInExpenses.paymentRate
    || config.variables.some((variable) => variable.expense);
}
