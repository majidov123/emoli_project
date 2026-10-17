import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceFormulaDashboard } from "../src/components/settings/PriceFormulaDashboard";
import {
  calculateExpenses,
  createEmptyPriceFormula,
  evaluateFormulaSteps,
  formatFormulaNumber,
  parsePriceFormula,
  selectedPaymentRate,
  togglePaymentSelection,
  validatePriceFormula,
  type FormulaPayment,
  type FormulaStep,
  type PriceFormulaConfiguration
} from "../src/components/settings/priceFormulaData";

const sample = { cost: 100, currentPrice: 150, categoryRate: 12, deliveryFee: 5 };

const categoryConfig = createEmptyPriceFormula();
categoryConfig.builtInExpenses.categoryRate = true;
assert.deepEqual(calculateExpenses(categoryConfig, sample), { total: 18, percentageRate: 12, fixedAmount: 0 });

const deliveryConfig = createEmptyPriceFormula();
deliveryConfig.builtInExpenses.deliveryFee = true;
assert.deepEqual(calculateExpenses(deliveryConfig, sample), { total: 5, percentageRate: 0, fixedAmount: 5 });

const paymentConfig = createEmptyPriceFormula();
paymentConfig.builtInExpenses.paymentRate = true;
paymentConfig.payments = [{ id: "card", name: "Kart", percentage: "0", selected: true, installment: false }];
assert.equal(calculateExpenses(paymentConfig, sample).total, 0);

const customConfig = createEmptyPriceFormula();
customConfig.variables = [{ id: "profit", name: "Komissiya", kind: "percent", value: "7", expense: true }];
assert.equal(calculateExpenses(customConfig, sample).total, 10.5);
assert.equal(formatFormulaNumber(calculateExpenses(customConfig, sample).total), "10.5");

const payments: FormulaPayment[] = [
  { id: "card", name: "Kart", percentage: "2", selected: false, installment: false },
  { id: "credit", name: "Kredit", percentage: "3", selected: false, installment: false },
  { id: "3", name: "Taksit 3 ay", percentage: "4", selected: false, installment: true },
  { id: "6", name: "Taksit 6 ay", percentage: "5", selected: false, installment: true }
];
let selected = togglePaymentSelection(payments, "card");
selected = togglePaymentSelection(selected, "credit");
selected = togglePaymentSelection(selected, "3");
assert.deepEqual(selected.filter((payment) => payment.selected).map((payment) => payment.id), ["card", "credit", "3"]);
assert.equal(selectedPaymentRate(selected), 9);
selected = togglePaymentSelection(selected, "6");
assert.deepEqual(selected.filter((payment) => payment.selected).map((payment) => payment.id), ["card", "credit", "6"]);
assert.equal(selectedPaymentRate(selected), 10);

const steps: FormulaStep[] = [
  {
    id: "first",
    start: { source: "cost", value: "100" },
    operations: [
      { id: "minus", type: "subtract", operand: { source: "number", value: "0" }, baseSource: "cost" },
      { id: "percent", type: "addValuePercent", operand: { source: "number", value: "0" }, baseSource: "cost" },
      { id: "plus", type: "add", operand: { source: "number", value: "0" }, baseSource: "cost" }
    ]
  },
  {
    id: "second",
    start: { source: "cost", value: "100" },
    operations: [{ id: "increase", type: "increasePercent", operand: { source: "number", value: "10" }, baseSource: "cost" }]
  }
];
const stepConfig: PriceFormulaConfiguration = { ...createEmptyPriceFormula(), steps };
const evaluations = evaluateFormulaSteps(stepConfig, sample);
assert.equal(evaluations[0]?.result, 100);
assert.equal(evaluations[0]?.operationResults[0]?.summary, "100 ₼ − 0 = 100 ₼");
assert.equal(evaluations[0]?.operationResults[1]?.summary, "100 ₼ + Maya (100 ₼) × 0% = 100 ₼");
assert.equal(evaluations[0]?.formula, "Maya − 0 + Maya (100 ₼) × 0% + 0");
assert.equal(evaluations[1]?.result, 110);

const invalid = createEmptyPriceFormula();
invalid.variables = [{ id: "empty", name: "", kind: "percent", value: "7", expense: true }];
assert.ok(validatePriceFormula(invalid).includes("Dəyişənin adı boşdur"));
invalid.steps = [{ id: "dangling", start: { source: "custom:deleted", value: "0" }, operations: [] }];
assert.ok(validatePriceFormula(invalid).includes("Addım 1 üçün seçilmiş başlanğıc dəyər mövcud deyil"));
const restored = parsePriceFormula(JSON.stringify(stepConfig));
assert.deepEqual(restored, stepConfig);

const markup = renderToStaticMarkup(createElement(PriceFormulaDashboard, { storeId: "test-store" }));
for (const requiredText of [
  "Qiymət düsturu",
  "Dəyişənlər",
  "Ödəniş növləri",
  "Hesab addımları",
  "Nəticələr",
  "Maya ilə avtomatik doldurma",
  "Nümunə məhsul",
  "Düstur hələ boşdur"
]) {
  assert.ok(markup.includes(requiredText), `Expected initial formula markup to include: ${requiredText}`);
}

console.log("Price formula test passed: initial render, expense previews, payment rules, validation, persistence parsing, and independent step calculations verified.");
