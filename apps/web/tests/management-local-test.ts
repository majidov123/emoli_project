import assert from "node:assert/strict";
import type { LocalOrder, SettingsManagementSummary } from "../src/types";
import {
  ANALYTICS_PERIOD_TOOLTIP,
  ANALYTICS_SECTION_TOOLTIPS,
  ANALYTICS_TOOLTIPS,
  PRICE_COMPARISON_COLUMN_TOOLTIPS,
  RANKING_TOOLTIPS,
  SETTLEMENT_TOOLTIPS,
  calculateAnalyticsMetrics,
  calculateTopProducts,
  currentMonthPeriod,
  ordersInPeriod,
  parseAnalyticsPeriod,
  parsePickupPoints
} from "../src/components/settings/managementData";

const order: LocalOrder = {
  id: "order-1",
  externalId: "LOCAL-1",
  customerName: "Demo müştəri",
  totalAmount: "42.50",
  orderedAt: "2026-10-05T10:00:00.000Z",
  currentStatus: "DELIVERED",
  loadedAt: "2026-10-05T10:01:00.000Z",
  items: [{ id: "item-1", productExternalId: "P-1", productName: "Demo məhsul", imageUrl: null, quantity: 2, unitPrice: "21.25" }],
  statusHistory: []
};

const summary = {
  totalProducts: 12,
  activeProducts: 7
} as SettingsManagementSummary;

assert.deepEqual(currentMonthPeriod(new Date(2026, 9, 11)), { from: "2026-10-01", to: "2026-10-31" });
assert.deepEqual(parseAnalyticsPeriod('{"from":"2026-09-01","to":"2026-10-31"}'), { from: "2026-09-01", to: "2026-10-31" });
assert.equal(parseAnalyticsPeriod('{"from":"2026-10-31","to":"2026-09-01"}'), null);
assert.equal(parseAnalyticsPeriod("not json"), null);
assert.equal(ordersInPeriod([order], { from: "2026-10-01", to: "2026-10-31" }).length, 1);
assert.equal(ordersInPeriod([order], { from: "2026-09-01", to: "2026-09-30" }).length, 0);

const metrics = calculateAnalyticsMetrics([order], summary);
assert.equal(metrics.turnover, "42.50");
assert.equal(metrics.orderCount, 1);
assert.equal(metrics.salesCount, 1);
assert.equal(metrics.deliveryRate, 100);
assert.equal(metrics.averageReceipt, "42.50");
assert.equal(metrics.productCount, 12);
assert.equal(metrics.activeProductCount, 7);

assert.deepEqual(calculateTopProducts([order]), [{ name: "Demo məhsul", amount: "42.50", quantity: 2 }]);
assert.deepEqual(calculateTopProducts([order], "quantity"), [{ name: "Demo məhsul", amount: "42.50", quantity: 2 }]);
assert.equal(parsePickupPoints("not json").length, 0);
const legacyPoint = parsePickupPoints(JSON.stringify([{ id: "p1", name: "Anbar", address: "Lokal ünvan", type: "Anbar", createdAt: "2026-10-11T00:00:00.000Z" }]));
assert.equal(legacyPoint.length, 1);
assert.equal(legacyPoint[0]?.note, "");
const pointWithNote = parsePickupPoints(JSON.stringify([{ id: "p2", name: "Mağaza", address: "Lokal ünvan", type: "Mağaza", note: "Arxa girişdən yaxınlaşın", createdAt: "2026-10-11T00:00:00.000Z" }]));
assert.equal(pointWithNote[0]?.note, "Arxa girişdən yaxınlaşın");
assert.equal(Object.keys(ANALYTICS_TOOLTIPS).length, 8);
assert.equal(ANALYTICS_TOOLTIPS.turnover, "Müştərilərin sifariş etdiyi məhsulların ümumi dəyəri (GMV). Ödənilib-ödənilməməsindən asılı olmayaraq bütün sifarişlərin cəmidir.");
assert.equal(Object.keys(SETTLEMENT_TOOLTIPS).length, 12);
assert.deepEqual(SETTLEMENT_TOOLTIPS, {
  orderAmount: "Müştərilərin sifariş verdiyi ümumi məbləğ (yaranma tarixinə görə). Hələ çatdırılmamış sifarişlər də daxildir.",
  deliveredAmount: "Faktiki çatdırılıb tamamlanan sifarişlərin ümumi dəyəri. Sənin hesabına köçürüləcək məbləğin əsasıdır.",
  deliveryPercentage: "Sifariş məbləğinin neçə faizi çatdırıldı. Bu göstərici nə qədər yüksəkdirsə, bir o qədər yaxşıdır.",
  sales: "Hesablaşma dövrü üzrə faktiki satış məbləği. Bank komissiyası hələ çıxılmayıb.",
  bankCommission: "Bank kartı ilə edilən ödənişlər üçün bankın tutduğu faiz. Adətən 1-3% arasında olur.",
  commissionPercentage: "Bank komissiyasının satışlara nisbəti. Bu faiz nə qədər aşağı olsa bir o qədər yaxşıdır.",
  umicoTr: "TR (Take Rate) — Birmarket platformasının öz komissiyası. Kateqoriyaya görə dəyişir (adətən 5-15%).",
  trWithVat: "Umico TR komissiyasına ƏDV (18%) əlavə edilmiş məbləğ.",
  trPercentage: "Platform komissiyasının satışlara nisbəti (faizlə).",
  installmentCommission: "Taksitli (hissə-hissə ödəniş) sifarişlər üçün əlavə komissiya. Müştəri taksit seçirsə bu məbləğ tutulur.",
  netIncome: "Bütün komissiyalar (bank, platform, taksit) çıxıldıqdan sonra sənin hesabına gələcək xalis məbləğ.",
  incomePercentage: "Xalis gəlirin satışlara nisbəti. Məsələn 80% o deməkdir ki, hər 100 ₼ satışdan 80 ₼ sənin olur."
});
assert.equal(ANALYTICS_PERIOD_TOOLTIP, "📅 Dövr seçimi\n\nAşağıdakı tarix seçicidən istənilən ay aralığını seçin, sonra \"Yenilə\" düyməsini basın.\n\n💾 Seçilmiş dövr yadda saxlanılır — səhifəni yeniləsəniz belə həmin tarix aralığını göstərməyə davam edəcək.");
assert.deepEqual(ANALYTICS_SECTION_TOOLTIPS, {
  daily: "Seçilmiş dövr ərzində günlük satış həcmini göstərir. Hansı günlərdə daha aktiv olduğunu görüb kampaniyalarını planlaya bilərsən.",
  category: "Satışlarının hansı kateqoriyalardan gəldiyini göstərir. Məsələn 'Elektronika' 70%, 'Ev əşyaları' 30%. Hansı kateqoriyaya daha çox diqqət etmək lazım olduğunu görürsən.",
  priceComparison: "Hər məhsulun sənin qiymətin ilə rəqiblərin qiyməti müqayisə edilir. Hansı məhsullarda bahalı satdığını görüb qiymət strategiyasını qura bilərsən."
});
assert.deepEqual(RANKING_TOOLTIPS, {
  top20Amount: "Sənin mağazandan ən çox gəlir gətirən 20 məhsul. Bu məhsulların ehtiyatı həmişə dolu saxlanılmalıdır.",
  top20Quantity: "Sənin mağazandan ən çox ədəd satılan 20 məhsul. Ucuz amma tez-tez satılan məhsulları görürsən.",
  top100Amount: "Bütün Birmarket platformasında ən çox gəlir gətirən 100 məhsul (yalnız sənin mağazan yox, bütün satıcılar). Əgər bu siyahıdakı məhsullar sənin mağazanda yoxdursa — bu bir imkandır!",
  top100Quantity: "Bütün Birmarket platformasında ən çox ədəd satılan 100 məhsul. Bazarda ən populyar məhsulları buradan izləyə bilərsən."
});
assert.deepEqual(PRICE_COMPARISON_COLUMN_TOOLTIPS, {
  code: "Birmarket-dəki məhsul kodu (ID).",
  productName: "Birmarket-dəki məhsulun adı.",
  category: "Məhsulun aid olduğu kateqoriya.",
  brand: "Məhsulun brendi.",
  yourPrice: "Sənin bu məhsul üçün qoyduğun qiymət.",
  minimumPrice: "Birmarket-də bu məhsulun digər satıcılar arasındakı ən aşağı qiymət (rəqibin qiyməti).",
  difference: "Sənin qiymətinin rəqib qiymətindən fərqi. 🟢 Mənfi = sən ucuzsan. 🔴 Müsbət = rəqib daha ucuzdur.",
  minimumSeller: "Bu məhsulu ən ucuz qiymətə satan mağaza.",
  sellerCount: "Bu məhsulu satan aktiv mağaza sayı. Çox rəqib var deməkdir.",
  link: "Birmarket-dəki məhsul səhifəsinə keçid."
});

console.log("Management local tests passed");
