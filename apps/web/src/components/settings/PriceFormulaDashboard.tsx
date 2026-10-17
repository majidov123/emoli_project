import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import {
  DELIVERY_FEE_SAMPLE,
  OPERATION_HELP,
  OPERATION_LABELS,
  calculateExpenses,
  createEmptyPriceFormula,
  createLocalFormulaId,
  evaluateFormulaSteps,
  formatFormulaNumber,
  formulaValueLabel,
  hasFormulaContent,
  numericFormulaValue,
  parsePriceFormula,
  priceFormulaStorageKey,
  selectedPaymentRate,
  togglePaymentSelection,
  validatePriceFormula,
  type FormulaOperation,
  type FormulaOperationType,
  type FormulaPayment,
  type FormulaSample,
  type FormulaStep,
  type FormulaValueKey,
  type FormulaVariable,
  type PriceFormulaConfiguration
} from "./priceFormulaData";

interface PriceFormulaDashboardProps {
  storeId?: string;
}

interface PreviewSampleInputs {
  cost: string;
  currentPrice: string;
  categoryRate: string;
  packageName: string;
}

const operationTypes: FormulaOperationType[] = [
  "add",
  "subtract",
  "increasePercent",
  "decreasePercent",
  "addValuePercent",
  "addExpenses",
  "multiply",
  "divide"
];

const operationChips: Array<{ type: FormulaOperationType; label: string }> = [
  { type: "increasePercent", label: "+ Faiz" },
  { type: "add", label: "+ Məbləğ" },
  { type: "decreasePercent", label: "− Faiz" },
  { type: "subtract", label: "− Məbləğ" },
  { type: "addValuePercent", label: "% Dəyərin faizi" },
  { type: "addExpenses", label: "+ Xərclər" },
  { type: "multiply", label: "× Vur" },
  { type: "divide", label: "÷ Böl" }
];

const quickPayments = [
  ["Kart", false],
  ["Kredit", false],
  ["Taksit 3 ay", true],
  ["Taksit 6 ay", true],
  ["Taksit 9 ay", true],
  ["Taksit 12 ay", true],
  ["Taksit 18 ay", true],
  ["Taksit 24 ay", true]
] as const;

const operationGuide = [
  {
    title: "+ Faiz",
    body: "Yuxarıdakı nəticəni yazdığınız faiz qədər artırır. Faiz həmin nəticənin özündən hesablanır.",
    example: "100 → + Faiz 15 → 115",
    when: "Hər hansı dəyəri faizlə artırmaq lazım olanda."
  },
  {
    title: "− Faiz",
    body: "Yuxarıdakı nəticəni yazdığınız faiz qədər azaldır. Faiz həmin nəticənin özündən hesablanır.",
    example: "200 → − Faiz 10 → 180",
    when: "Hər hansı dəyəri faizlə azaltmaq lazım olanda."
  },
  {
    title: "+ Məbləğ",
    body: "Nəticəyə yazdığınız dəyəri olduğu kimi əlavə edir (faiz kimi hesablanmır).",
    example: "115 → + 5 → 120",
    when: "Sabit bir məbləği və ya başqa bir dəyəri toplamaq lazım olanda."
  },
  {
    title: "− Məbləğ",
    body: "Nəticədən yazdığınız dəyəri olduğu kimi çıxır.",
    example: "120 → − 5 → 115",
    when: "Sabit bir məbləği və ya başqa bir dəyəri çıxmaq lazım olanda."
  },
  {
    title: "+ Dəyərin faizi",
    body: "Başqa bir dəyərin faizini tapıb nəticənin üstünə gəlir. “dəyər” xanasında faizin hansı dəyərdən hesablanacağını seçirsiniz (məs. Maya), “faiz” xanasına faizi yazırsınız (məs. 70).",
    example: "Nəticə 200, seçilən dəyər 100 → + 70%-i → 200 + 70 = 270",
    when: "Faizi yuxarıdakı nəticədən yox, başqa bir dəyərdən hesablamaq lazım olanda."
  },
  {
    title: "+ Xərclər",
    body: "“Satışdan tutulur” işarələnmiş bütün dəyərləri nəzərə alır və qiyməti elə qaldırır ki, onlar satışdan tutulandan sonra sizə yuxarıdakı nəticə qədər qalsın. Çatdırılma haqqından faiz tutulmur — o, ən sonda üstünə gəlir. Dəyər yazmaq lazım deyil.",
    example: "Nəticə 115, tutulma 17.5% + çatdırılma 5 → 115 ÷ 0.825 + 5 = 144.39 → çatdırılma (5) və 17.5% tutulandan sonra 115 qalır",
    when: "Satış qiymətini tapmaq lazım olanda: sizə nə qədər qalmalı olduğunu bilirsiniz, bot satışdan tutulanları da üstünə gəlir."
  },
  {
    title: "× Vur",
    body: "Nəticəni yazdığınız ədədə vurur.",
    example: "115 → × 2 → 230",
    when: "Dəyəri neçə misli artırmaq lazım olanda."
  },
  {
    title: "÷ Böl",
    body: "Nəticəni yazdığınız ədədə bölür.",
    example: "230 → ÷ 2 → 115",
    when: "Dəyəri hissələrə bölmək lazım olanda."
  }
];

function createOperation(type: FormulaOperationType): FormulaOperation {
  return {
    id: createLocalFormulaId("operation"),
    type,
    operand: { source: "number", value: type === "multiply" || type === "divide" ? "1" : "0" },
    baseSource: "cost"
  };
}

function createStep(): FormulaStep {
  return {
    id: createLocalFormulaId("step"),
    start: { source: "cost", value: "100" },
    operations: []
  };
}

function formatMoney(value: number) {
  return `${formatFormulaNumber(value)} ₼`;
}

function numberIsMissing(value: string) {
  return !value.trim() || !Number.isFinite(Number(value.trim().replace(",", ".")));
}

function operationTone(type: FormulaOperationType) {
  if (type === "subtract" || type === "decreasePercent") return "red";
  if (type === "addValuePercent") return "cyan";
  if (type === "addExpenses") return "pink";
  if (type === "multiply" || type === "divide") return "orange";
  return "green";
}

export function PriceFormulaDashboard({ storeId }: PriceFormulaDashboardProps) {
  const storageKey = useMemo(() => priceFormulaStorageKey(storeId), [storeId]);
  const [config, setConfig] = useState<PriceFormulaConfiguration>(() => createEmptyPriceFormula());
  const [sampleInputs, setSampleInputs] = useState<PreviewSampleInputs>({
    cost: "100",
    currentPrice: "150",
    categoryRate: "12",
    packageName: "Standart"
  });
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const guideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setConfig(parsePriceFormula(window.localStorage.getItem(storageKey)));
    } catch {
      setConfig(createEmptyPriceFormula());
    }
    setDirty(false);
    setSaveMessage("");
  }, [storageKey]);

  useEffect(() => {
    if (!guideOpen) return;
    function closeOnOutside(event: PointerEvent) {
      if (!guideRef.current?.contains(event.target as Node)) setGuideOpen(false);
    }
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setGuideOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [guideOpen]);

  function updateConfig(updater: (current: PriceFormulaConfiguration) => PriceFormulaConfiguration) {
    setConfig((current) => updater(current));
    setDirty(true);
    setSaveMessage("");
  }

  const sample: FormulaSample = {
    cost: numericFormulaValue(sampleInputs.cost),
    currentPrice: numericFormulaValue(sampleInputs.currentPrice),
    categoryRate: numericFormulaValue(sampleInputs.categoryRate),
    deliveryFee: DELIVERY_FEE_SAMPLE
  };
  const sampleErrors = [
    numberIsMissing(sampleInputs.cost) ? "Maya boşdur" : "",
    numberIsMissing(sampleInputs.currentPrice) ? "Hazırki qiymət boşdur" : "",
    numberIsMissing(sampleInputs.categoryRate) ? "Kateqoriya faizi boşdur" : ""
  ].filter(Boolean);
  const errors = [...sampleErrors, ...validatePriceFormula(config)];
  const evaluations = evaluateFormulaSteps(config, sample);
  const expenses = calculateExpenses(config, sample);
  const netIncome = sample.currentPrice - expenses.total;
  const profit = netIncome - sample.cost;
  const profitRate = sample.cost === 0 ? 0 : profit / sample.cost * 100;
  const paymentRate = selectedPaymentRate(config.payments);
  const selectedPayments = config.payments.filter((payment) => payment.selected);
  const showProfit = config.builtInExpenses.categoryRate
    || config.builtInExpenses.deliveryFee
    || config.builtInExpenses.paymentRate
    || config.variables.some((variable) => variable.expense);

  function saveFormula() {
    if (errors.length > 0) {
      setSaveMessage("Düzəliş tələb edən məlumatlar var.");
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(config));
      setDirty(false);
      setSaveMessage("Düstur bu mağaza üçün yadda saxlanıldı.");
    } catch {
      setSaveMessage("Düsturu lokal yaddaşda saxlamaq mümkün olmadı.");
    }
  }

  function setBuiltInExpense(key: keyof PriceFormulaConfiguration["builtInExpenses"]) {
    updateConfig((current) => ({
      ...current,
      builtInExpenses: { ...current.builtInExpenses, [key]: !current.builtInExpenses[key] }
    }));
  }

  function addVariable() {
    const variable: FormulaVariable = {
      id: createLocalFormulaId("variable"),
      name: "",
      kind: "percent",
      value: "0",
      expense: false
    };
    updateConfig((current) => ({ ...current, variables: [...current.variables, variable] }));
  }

  function patchVariable(id: string, patch: Partial<FormulaVariable>) {
    updateConfig((current) => ({
      ...current,
      variables: current.variables.map((variable) => variable.id === id ? { ...variable, ...patch } : variable)
    }));
  }

  function addPayment() {
    const payment: FormulaPayment = {
      id: createLocalFormulaId("payment"),
      name: "",
      percentage: "0",
      selected: true,
      installment: false
    };
    updateConfig((current) => ({ ...current, payments: [...current.payments, payment] }));
  }

  function addQuickPayments() {
    updateConfig((current) => {
      const existing = new Set(current.payments.map((payment) => payment.name.toLocaleLowerCase("az")));
      const additions = quickPayments.flatMap(([name, installment], index): FormulaPayment[] => (
        existing.has(name.toLocaleLowerCase("az")) ? [] : [{
          id: createLocalFormulaId("payment"),
          name,
          percentage: "0",
          selected: current.payments.length === 0 && index === 0,
          installment
        }]
      ));
      return { ...current, payments: [...current.payments, ...additions] };
    });
  }

  function patchPayment(id: string, patch: Partial<FormulaPayment>) {
    const normalizedPatch = patch.name === undefined ? patch : {
      ...patch,
      installment: patch.name.trim().toLocaleLowerCase("az").startsWith("taksit")
    };
    updateConfig((current) => ({
      ...current,
      payments: current.payments.map((payment) => {
        if (payment.id === id) return { ...payment, ...normalizedPatch };
        if (normalizedPatch.installment && current.payments.find((item) => item.id === id)?.selected && payment.installment) {
          return { ...payment, selected: false };
        }
        return payment;
      })
    }));
  }

  function paymentSummary() {
    if (selectedPayments.length === 0) return "Limit hesabında: heç biri seçilməyib";
    const parts = selectedPayments.map((payment) => `${payment.name.trim() || "adsız"} ${formatFormulaNumber(numericFormulaValue(payment.percentage))}%`);
    return `Limit hesabında: ${parts.join(" + ")}${parts.length > 1 ? ` = ${formatFormulaNumber(paymentRate)}%` : ""}`;
  }

  function patchStep(id: string, updater: (step: FormulaStep) => FormulaStep) {
    updateConfig((current) => ({
      ...current,
      steps: current.steps.map((step) => step.id === id ? updater(step) : step)
    }));
  }

  function moveStep(index: number, direction: -1 | 1) {
    updateConfig((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.steps.length) return current;
      const steps = [...current.steps];
      [steps[index], steps[target]] = [steps[target]!, steps[index]!];
      return { ...current, steps };
    });
  }

  function duplicateStep(index: number) {
    updateConfig((current) => {
      const source = current.steps[index];
      if (!source) return current;
      const copy: FormulaStep = {
        ...source,
        id: createLocalFormulaId("step"),
        start: { ...source.start },
        operations: source.operations.map((operation) => ({
          ...operation,
          id: createLocalFormulaId("operation"),
          operand: { ...operation.operand }
        }))
      };
      const steps = [...current.steps];
      steps.splice(index + 1, 0, copy);
      return { ...current, steps };
    });
  }

  function valueOptions(stepIndex: number) {
    const options: Array<{ value: FormulaValueKey; label: string }> = [
      { value: "number", label: "Rəqəm yaz" },
      { value: "cost", label: `Maya (${formatFormulaNumber(sample.cost)} ₼)` },
      { value: "currentPrice", label: `Hazırki qiymət (${formatFormulaNumber(sample.currentPrice)} ₼)` },
      { value: "categoryRate", label: `Kateqoriya faizi (${formatFormulaNumber(sample.categoryRate)}%)` },
      { value: "deliveryFee", label: "Çatdırılma haqqı (qiymətə görə)" },
      { value: "paymentRate", label: `Ödəniş faizi (${config.payments.length ? `${formatFormulaNumber(paymentRate)}%` : "—"})` }
    ];
    config.variables.forEach((variable) => options.push({
      value: `custom:${variable.id}`,
      label: variable.name.trim() || "Adsız dəyişən"
    }));
    config.steps.slice(0, stepIndex).forEach((_, index) => options.push({
      value: `step:${config.steps[index]!.id}`,
      label: `Addım ${index + 1} nəticəsi`
    }));
    return options;
  }

  function updateOperation(stepId: string, operationId: string, patch: Partial<FormulaOperation>) {
    patchStep(stepId, (step) => ({
      ...step,
      operations: step.operations.map((operation) => operation.id === operationId ? { ...operation, ...patch } : operation)
    }));
  }

  return (
    <div className="price-formula">
      <header className="price-formula__header">
        <div>
          <h1>Qiymət düsturu</h1>
          <p>Öz qiymət məntiqinizi qurun: hansı faizlər, nəyin üzərinə gəlir, alt/üst limit və endirimli/endrimsiz qiymət necə hesablanır. Satışdan tutulan dəyərləri işarələsəniz, hər məhsulun qazancı da göstəriləcək. Düstur yalnız bu mağaza üçündür.</p>
        </div>
        <div className="price-formula__header-actions" ref={guideRef}>
          <button type="button" className="formula-button formula-button--secondary" aria-expanded={guideOpen} aria-controls="formula-guide" onClick={() => setGuideOpen((open) => !open)}><Icon name="info" />Necə qurulur?</button>
          <button type="button" className="formula-button formula-button--primary" disabled={!dirty} onClick={saveFormula}><Icon name="draft" />Yadda saxla</button>
        </div>
      </header>

      {guideOpen ? (
        <section id="formula-guide" className="formula-guide" aria-label="Qiymət düsturunun qurulması">
          <h2>Necə qurulur:</h2>
          <div className="formula-guide__intro">
            <p><strong>Dəyişənlər</strong> — işlətdiyiniz faiz və məbləğlər: məs. Xeyir 15%, DSMF 2%, SV 2%.</p>
            <p><strong>Ödəniş növləri</strong> — Kart, Kredit, Taksit... və onların faizi. Biri default olur (məs. Kart). Düsturda “Ödəniş faizi” kimi işlədilir.</p>
            <p><strong>Hesab addımları</strong> — hər addım bir dəyərdən başlayır (məs. Maya), üzərinə əməliyyatlar gəlir: + faiz, + məbləğ, − faiz... Sonrakı addımlar əvvəlkilərin nəticəsini işlədə bilər. <strong>+ Xərclər</strong> əməliyyatı qiyməti elə qaldırır ki, satışdan tutulanlardan sonra sizə yuxarıdakı məbləğ qalsın.</p>
            <p><strong>Nəticələr</strong> — hansı addım alt limit, endirimli qiymət, üst limit və endirimsiz qiymətdir.</p>
            <p><strong>Satışdan tutulur</strong> — dəyişənlərdə və məhsuldan gələn dəyərlərdə (kateqoriya faizi, ödəniş faizi, çatdırılma) bu işarəni qoyun. Həm qazanc, həm “+ Xərclər” işarələnmiş dəyərləri çıxır.</p>
          </div>
          <h3>Əməliyyatlar:</h3>
          <div className="formula-guide__operations">
            {operationGuide.map((item) => (
              <article key={item.title}>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
                <code>{item.example}</code>
                <p><strong>Nə vaxt:</strong> {item.when}</p>
              </article>
            ))}
          </div>
          <div className="formula-guide__examples">
            <h3>Nümunə:</h3>
            <p>• <strong>Sadə:</strong> Alt limit = Maya + Faiz 50 · Üst limit = Maya + Faiz 70 · Endirimsiz = Maya + Faiz 150.</p>
            <p>• <strong>Xərclərlə:</strong> Alt limit = Maya + Faiz (Xeyir 15%) + Xərclər → maya 100 ₼ olanda bot qiyməti elə tapır ki, xərclərdən sonra sizə 115 ₼ qalsın.</p>
            <p>Çatdırılma haqqı nəticə qiymətinə görə avtomatik götürülür (10 və 50 ₼ sərhədləri nəzərə alınır).</p>
          </div>
        </section>
      ) : null}

      <div className="price-formula__layout">
        <div className="price-formula__sections">
          <section className="formula-section" aria-labelledby="formula-variables-title">
            <div className="formula-section__heading">
              <span>1</span>
              <div>
                <h2 id="formula-variables-title">Dəyişənlər</h2>
                <p>Düsturda işlədəcəyiniz faizlər və məbləğlər. Satış qiymətindən tutulanları (komissiya, bank faizi, vergilər...) “Satışdan tutulur” kimi işarələyin — qazanc və “+ Xərclər” yalnız onları çıxır. Sizin xeyir faiziniz tutulmur, onu işarələməyin.</p>
              </div>
            </div>
            <h3 className="formula-section__eyebrow">Məhsuldan gələn dəyərlər (bot özü verir)</h3>
            <div className="formula-builtins">
              <span className="formula-builtins__item">Maya (100 ₼ — nümunə)</span>
              <span className="formula-builtins__item">Hazırki qiymət (150 ₼ — nümunə)</span>
              <ExpenseToggle label="Kateqoriya faizi (12% — nümunə)" selected={config.builtInExpenses.categoryRate} onClick={() => setBuiltInExpense("categoryRate")} />
              <ExpenseToggle label="Çatdırılma haqqı (qiymətə görə — nümunə)" selected={config.builtInExpenses.deliveryFee} onClick={() => setBuiltInExpense("deliveryFee")} />
              <ExpenseToggle label="Ödəniş faizi (— — nümunə)" selected={config.builtInExpenses.paymentRate} onClick={() => setBuiltInExpense("paymentRate")} />
            </div>
            <div className="formula-variable-grid">
              {config.variables.map((variable) => (
                <article className={`formula-variable${variable.expense ? " is-expense" : ""}`} key={variable.id}>
                  <div className="formula-variable__name">
                    <input aria-label="Dəyişənin adı" placeholder="Dəyişənin adı" value={variable.name} onChange={(event) => patchVariable(variable.id, { name: event.target.value })} />
                    <button type="button" aria-label="Dəyişəni sil" onClick={() => updateConfig((current) => ({ ...current, variables: current.variables.filter((item) => item.id !== variable.id) }))}><Icon name="trash" /></button>
                  </div>
                  <div className="formula-variable__kind" role="group" aria-label="Dəyişənin növü">
                    <button type="button" className={variable.kind === "percent" ? "is-active" : ""} aria-pressed={variable.kind === "percent"} onClick={() => patchVariable(variable.id, { kind: "percent" })}>Faiz %</button>
                    <button type="button" className={variable.kind === "amount" ? "is-active" : ""} aria-pressed={variable.kind === "amount"} onClick={() => patchVariable(variable.id, { kind: "amount" })}>Məbləğ ₼</button>
                  </div>
                  <label className="formula-number-input">
                    <span className="sr-only">Dəyişənin dəyəri</span>
                    <input type="number" step="0.1" value={variable.value} onChange={(event) => patchVariable(variable.id, { value: event.target.value })} />
                    <b>{variable.kind === "percent" ? "%" : "₼"}</b>
                  </label>
                  <button type="button" className={`formula-expense-button${variable.expense ? " is-selected" : ""}`} aria-pressed={variable.expense} onClick={() => patchVariable(variable.id, { expense: !variable.expense })}>{variable.expense ? "✓" : "□"} Satışdan tutulur</button>
                  <p className={variable.expense ? "is-success" : ""}>{variable.expense ? "Xərc kimi işlədilir" : "Hələ düsturda işlədilmir"}</p>
                </article>
              ))}
              <button type="button" className="formula-dashed-card" onClick={addVariable}><span>＋</span>Dəyişən əlavə et</button>
            </div>
          </section>

          <section className="formula-section" aria-labelledby="formula-payments-title">
            <div className="formula-section__heading">
              <span>2</span>
              <div>
                <h2 id="formula-payments-title">Ödəniş növləri</h2>
                <p>Müştəri necə ödəyəndə bank satışdan neçə faiz tutur. Limitlərin hesabında nəzərə alınacaqları “Seç” ilə işarələyin — seçilənlərin faizləri toplanır və düsturda “Ödəniş faizi” kimi işlədilir. Taksitlərdən yalnız biri seçilə bilər. Sifarişlərin qazancında isə hər sifarişin öz ödəniş üsulu götürülür.</p>
              </div>
            </div>
            <div className="formula-payment-list">
              {config.payments.map((payment) => (
                <div className={`formula-payment${payment.selected ? " is-selected" : ""}`} key={payment.id}>
                  <input aria-label="Ödəniş növünün adı" placeholder="Ad (məs. Kart)" value={payment.name} onChange={(event) => patchPayment(payment.id, { name: event.target.value })} />
                  <label className="formula-number-input"><span className="sr-only">Faiz</span><input type="number" min="0" step="0.1" value={payment.percentage} onChange={(event) => patchPayment(payment.id, { percentage: event.target.value })} /><b>%</b></label>
                  <button type="button" className="formula-select-button" aria-pressed={payment.selected} onClick={() => updateConfig((current) => ({ ...current, payments: togglePaymentSelection(current.payments, payment.id) }))}>{payment.selected ? "✓ Seçilib" : "Seç"}</button>
                  <button type="button" className="formula-icon-button formula-icon-button--danger" aria-label={`${payment.name || "Ödəniş növünü"} sil`} onClick={() => updateConfig((current) => ({ ...current, payments: current.payments.filter((item) => item.id !== payment.id) }))}><Icon name="trash" /></button>
                </div>
              ))}
            </div>
            {config.payments.length > 0 ? <p className="formula-payment-summary">{paymentSummary()}</p> : null}
            <div className="formula-payment-actions">
              <button type="button" className="formula-dashed-button" onClick={addPayment}>＋ Ödəniş növü əlavə et</button>
              <button type="button" className="formula-button formula-button--secondary" onClick={addQuickPayments}>+ Kart, Kredit, Taksit (3–24 ay) — faizləri siz yazın</button>
            </div>
          </section>

          <section className="formula-section formula-section--steps" aria-labelledby="formula-steps-title">
            <div className="formula-section__heading">
              <span>3</span>
              <div>
                <h2 id="formula-steps-title">Hesab addımları</h2>
                <p>Hər addım bir dəyərdən başlayır, üzərinə əməliyyatlar gəlir. Məs. “Alt limit” = Maya + 15%. “+ Xərclər” seçsəniz, bot qiyməti elə qaldırır ki, satışdan tutulanlardan sonra sizə yuxarıdakı məbləğ qalsın. Hər sətrin altında nə baş verdiyi yazılır.</p>
              </div>
            </div>
            <div className="formula-step-list">
              {config.steps.map((step, stepIndex) => {
                const evaluation = evaluations[stepIndex];
                const options = valueOptions(stepIndex);
                return (
                  <article className="formula-step" key={step.id}>
                    <header className="formula-step__header">
                      <div><span>{stepIndex + 1}</span><h3>Addım {stepIndex + 1}</h3></div>
                      <div className="formula-step__controls">
                        <output><small>NƏTİCƏ</small>{formatMoney(evaluation?.result ?? 0)}</output>
                        <button type="button" disabled={stepIndex === 0} aria-label="Addımı yuxarı daşı" onClick={() => moveStep(stepIndex, -1)}><Icon name="arrowUp" /></button>
                        <button type="button" disabled={stepIndex === config.steps.length - 1} aria-label="Addımı aşağı daşı" onClick={() => moveStep(stepIndex, 1)}><Icon name="arrowDown" /></button>
                        <button type="button" aria-label="Addımın surətini yarat" onClick={() => duplicateStep(stepIndex)}><Icon name="copy" /></button>
                        <button type="button" className="is-danger" aria-label="Addımı sil" onClick={() => updateConfig((current) => ({ ...current, steps: current.steps.filter((item) => item.id !== step.id) }))}><Icon name="trash" /></button>
                      </div>
                    </header>
                    <div className="formula-step__body">
                      <div className="formula-step__start">
                        <span className="formula-flow-dot">▶</span><strong>Başlanğıc</strong>
                        <ValueSelect value={step.start.source} options={options} ariaLabel={`Addım ${stepIndex + 1} başlanğıc dəyəri`} onChange={(source) => patchStep(step.id, (item) => ({ ...item, start: { ...item.start, source } }))} />
                        {step.start.source === "number" ? <input className="formula-inline-number" aria-label="Başlanğıc rəqəm" type="number" step="0.1" value={step.start.value} onChange={(event) => patchStep(step.id, (item) => ({ ...item, start: { ...item.start, value: event.target.value } }))} /> : null}
                        <p>{formulaValueLabel(step.start.source, config, sample)} = {formatMoney(evaluation?.startValue ?? 0)}</p>
                      </div>
                      {step.operations.map((operation, operationIndex) => (
                        <div className={`formula-operation tone-${operationTone(operation.type)}`} key={operation.id}>
                          <span className="formula-flow-dot">{operation.type === "subtract" || operation.type === "decreasePercent" ? "−" : operation.type === "multiply" ? "×" : operation.type === "divide" ? "÷" : "+"}</span>
                          <div className="formula-operation__fields">
                            <label className="formula-operation__type">
                              <span className="sr-only">Əməliyyat</span>
                              <select aria-label={`Addım ${stepIndex + 1}, əməliyyat ${operationIndex + 1}`} value={operation.type} onChange={(event) => updateOperation(step.id, operation.id, { type: event.target.value as FormulaOperationType })}>
                                {operationTypes.map((type) => <option value={type} key={type}>{OPERATION_LABELS[type]}</option>)}
                              </select>
                              <small>{OPERATION_HELP[operation.type]}</small>
                            </label>
                            {operation.type === "addValuePercent" ? (
                              <>
                                <span className="formula-operation__label">dəyər:</span>
                                <ValueSelect value={operation.baseSource} options={options.filter((option) => option.value !== "number")} ariaLabel="Faizin hesablandığı dəyər" onChange={(baseSource) => updateOperation(step.id, operation.id, { baseSource })} />
                                <span className="formula-operation__label">faiz:</span>
                              </>
                            ) : null}
                            {operation.type !== "addExpenses" ? (
                              <>
                                <ValueSelect value={operation.operand.source} options={options} ariaLabel="Əməliyyat dəyəri" onChange={(source) => updateOperation(step.id, operation.id, { operand: { ...operation.operand, source } })} />
                                {operation.operand.source === "number" ? (
                                  <label className="formula-number-input formula-number-input--operation"><span className="sr-only">Əməliyyat rəqəmi</span><input type="number" step="0.1" value={operation.operand.value} onChange={(event) => updateOperation(step.id, operation.id, { operand: { ...operation.operand, value: event.target.value } })} /><b>{operation.type === "increasePercent" || operation.type === "decreasePercent" || operation.type === "addValuePercent" ? "%" : operation.type === "add" || operation.type === "subtract" ? "₼" : ""}</b></label>
                                ) : null}
                              </>
                            ) : null}
                            <span className="formula-operation__help" title={OPERATION_HELP[operation.type]}>?</span>
                            <button type="button" className="formula-icon-button" aria-label="Əməliyyatı sil" onClick={() => patchStep(step.id, (item) => ({ ...item, operations: item.operations.filter((row) => row.id !== operation.id) }))}><Icon name="trash" /></button>
                          </div>
                          <p>{evaluation?.operationResults[operationIndex]?.summary}</p>
                        </div>
                      ))}
                      <div className="formula-operation-chips" aria-label={`Addım ${stepIndex + 1} üçün əməliyyat əlavə et`}>
                        <span className="formula-flow-dot">＋</span>
                        {operationChips.map((chip) => <button type="button" className={`tone-${operationTone(chip.type)}`} key={chip.type} onClick={() => patchStep(step.id, (item) => ({ ...item, operations: [...item.operations, createOperation(chip.type)] }))}>{chip.label}</button>)}
                      </div>
                    </div>
                    <footer><strong>Addım {stepIndex + 1}</strong> = <code>{evaluation?.formula || "—"}</code></footer>
                  </article>
                );
              })}
            </div>
            <button type="button" className="formula-dashed-button" onClick={() => updateConfig((current) => ({ ...current, steps: [...current.steps, createStep()] }))}>＋ Addım əlavə et</button>
          </section>

          <section className="formula-section formula-section--future" aria-labelledby="formula-results-title">
            <div className="formula-section__heading"><span>4</span><div><h2 id="formula-results-title">Nəticələr</h2><p>Hansı addımın nəticəsi hansı qiymətdir. İstəmədiyinizi boş saxlayın.</p></div></div>
            <div className="formula-results-shell">
              {[
                ["Alt limit", "Botun enə biləcəyi ən aşağı qiymət"],
                ["Endirimli qiymət", "Satış (endirimli) qiyməti"],
                ["Üst limit", "Botun qalxa biləcəyi ən yüksək qiymət"],
                ["Endirimsiz qiymət", "Üstündən xətt çəkilən (qara) qiymət"]
              ].map(([title, text]) => <div key={title}><strong>{title}</strong><small>{text}</small><select disabled aria-label={`${title} nəticəsi`}><option>Addım seçin</option></select></div>)}
            </div>
          </section>

          <section className="formula-section formula-section--future" aria-labelledby="formula-autofill-title">
            <div className="formula-section__heading"><span>5</span><div><h2 id="formula-autofill-title">Maya ilə avtomatik doldurma</h2><p>Hər əməliyyat üçün ayrıca: açıq olsa, maya yazılanda seçdiyiniz qiymət və limitlər bu düsturla hesablanır. Biri digərinə təsir etmir. Mayası olmayan məhsullara toxunulmur.</p></div></div>
            <p>Əvvəlcə “Nəticələr” bölməsində ən azı bir nəticəni addıma bağlayın.</p>
          </section>
        </div>

        <aside className="formula-preview" aria-labelledby="formula-preview-title" aria-live="polite">
          <h2 id="formula-preview-title">Nümunə məhsul</h2>
          <p>Düsturu yoxlamaq üçün — yadda saxlanmır.</p>
          <div className="formula-preview__inputs">
            <PreviewInput label="Maya" suffix="₼" value={sampleInputs.cost} onChange={(value) => setSampleInputs((current) => ({ ...current, cost: value }))} />
            <PreviewInput label="Hazırki qiymət" suffix="₼" value={sampleInputs.currentPrice} onChange={(value) => setSampleInputs((current) => ({ ...current, currentPrice: value }))} />
            <PreviewInput label="Kateqoriya faizi" suffix="%" value={sampleInputs.categoryRate} onChange={(value) => setSampleInputs((current) => ({ ...current, categoryRate: value }))} />
            <label><span>Paket</span><select value={sampleInputs.packageName} onChange={(event) => setSampleInputs((current) => ({ ...current, packageName: event.target.value }))}><option>Standart</option></select></label>
          </div>
          {config.payments.length > 0 ? (
            <div className="formula-preview__payments">
              <strong>Ödəniş növü · {selectedPayments.map((payment) => payment.name || "adsız").join(" + ") || "seçilməyib"} {formatFormulaNumber(paymentRate)}%</strong>
              <span>Seçilənlər · {formatFormulaNumber(paymentRate)}%</span>
            </div>
          ) : null}
          <div className="formula-preview__results">
            {[["Alt limit", "təyin edilməyib"], ["Endirimli qiymət", "təyin edilməyib"], ["Üst limit", "təyin edilməyib"], ["Endirimsiz qiymət", "təyin edilməyib"]].map(([label, value]) => <div key={label}><strong>{label}</strong><span>{value}</span></div>)}
          </div>
          <h3>Hazırki qiymətdə qazanc</h3>
          {showProfit && sampleErrors.length === 0 ? (
            <dl className="formula-preview__profit">
              <div><dt>Satış</dt><dd>{formatMoney(sample.currentPrice)}</dd></div>
              <div><dt>Xərclər</dt><dd className="is-negative">−{formatMoney(expenses.total)}</dd></div>
              <div><dt>Hesabınıza düşən</dt><dd>{formatMoney(netIncome)}</dd></div>
              <div><dt>Maya</dt><dd className="is-negative">−{formatMoney(sample.cost)}</dd></div>
              <div><dt>Qazanc</dt><dd className={profit >= 0 ? "is-positive" : "is-negative"}>{formatMoney(profit)} · {formatFormulaNumber(profitRate)}%</dd></div>
            </dl>
          ) : <p className="formula-preview__hint">Dəyişənlərdə satışdan tutulanları işarələyin.</p>}
          <div className={`formula-validation${errors.length ? " has-errors" : ""}`} role={errors.length ? "alert" : "status"}>
            {errors.length ? (
              <><strong>ⓘ {errors.length} xəta</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></>
            ) : <strong>✓ {hasFormulaContent(config) ? "Düstur düzgündür" : "Düstur hələ boşdur"}</strong>}
            {dirty ? <p>Yadda saxlanmamış dəyişikliklər var.</p> : null}
            {saveMessage ? <p>{saveMessage}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ExpenseToggle({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <span className={`formula-builtins__item formula-builtins__item--toggle${selected ? " is-selected" : ""}`}>
      <span>{label}</span>
      <button type="button" aria-pressed={selected} onClick={onClick}>{selected ? "✓" : "□"} Satışdan tutulur</button>
    </span>
  );
}

function ValueSelect({ value, options, ariaLabel, onChange }: { value: FormulaValueKey; options: Array<{ value: FormulaValueKey; label: string }>; ariaLabel: string; onChange: (value: FormulaValueKey) => void }) {
  return <select className="formula-value-select" aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value as FormulaValueKey)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

function PreviewInput({ label, suffix, value, onChange }: { label: string; suffix: string; value: string; onChange: (value: string) => void }) {
  return <label><span>{label}</span><span className="formula-number-input"><input type="number" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} /><b>{suffix}</b></span></label>;
}
