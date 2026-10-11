import { useEffect, useId, useState, type FormEvent } from "react";
import { Icon } from "../Icon";
import { PICKUP_POINT_TYPES, parsePickupPoints, pickupStorageKey, type PickupPoint, type PickupPointType } from "./managementData";

interface PickupPointsDashboardProps {
  storeId?: string;
}

export function PickupPointsDashboard({ storeId }: PickupPointsDashboardProps) {
  const nameId = useId();
  const addressId = useId();
  const typeId = useId();
  const storageKey = pickupStorageKey(storeId);
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<PickupPointType>("Mağaza");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setPoints(parsePickupPoints(window.localStorage.getItem(storageKey)));
  }, [storageKey]);

  function closeForm() {
    setFormOpen(false);
    setName("");
    setAddress("");
    setType("Mağaza");
  }

  function savePoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName || !trimmedAddress) return;
    const point: PickupPoint = {
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `point-${Date.now()}`,
      name: trimmedName,
      address: trimmedAddress,
      type,
      createdAt: new Date().toISOString()
    };
    const next = [...points, point];
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setPoints(next);
      setFeedback("Götürülmə nöqtəsi lokal olaraq yadda saxlanıldı.");
      closeForm();
    } catch {
      setFeedback("Götürülmə nöqtəsini lokal yaddaşda saxlamaq mümkün olmadı.");
    }
  }

  return (
    <div className="pickup-dashboard">
      <section className="pickup-intro" aria-labelledby="pickup-heading">
        <div>
          <h1 id="pickup-heading">Götürülmə nöqtələri</h1>
          <p>Burada işçilərinizin məhsulları haradan götürəcəyini müəyyənləşdirə bilərsiniz. Hər bir nöqtə üçün ad, ünvan və tip (mağaza, anbar və ya ticarət mərkəzi) daxil edin. Məhsullar səhifəsindən istənilən məhsula bu nöqtələrdən birini təyin etmək mümkündür. Məsələn: <em>Sədərək ticarət mərkəzi, sıra 17, mağaza 22</em></p>
        </div>
        <button type="button" className="pickup-add-button" onClick={() => { setFormOpen(true); setFeedback(null); }} aria-expanded={formOpen}>
          <Icon name="plus" />Yeni nöqtə
        </button>
      </section>

      {formOpen ? (
        <form className="pickup-form" onSubmit={savePoint} aria-labelledby="pickup-form-heading">
          <div className="pickup-form__heading">
            <div><span className="pickup-form__icon"><Icon name="truck" /></span><h2 id="pickup-form-heading">Yeni götürülmə nöqtəsi</h2></div>
            <button type="button" className="settings-icon-button" onClick={closeForm} aria-label="Formu bağla"><Icon name="x" /></button>
          </div>
          <div className="pickup-form__grid">
            <label htmlFor={nameId}><span>Nöqtənin adı</span><input id={nameId} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus /></label>
            <label htmlFor={addressId}><span>Ünvan</span><input id={addressId} value={address} onChange={(event) => setAddress(event.target.value)} maxLength={240} required /></label>
            <label htmlFor={typeId}><span>Tip</span><select id={typeId} value={type} onChange={(event) => setType(event.target.value as PickupPointType)}>{PICKUP_POINT_TYPES.map((option) => <option key={option}>{option}</option>)}</select></label>
          </div>
          <div className="pickup-form__actions">
            <button type="button" className="button button--secondary" onClick={closeForm}>Ləğv et</button>
            <button type="submit" className="button button--primary" disabled={!name.trim() || !address.trim()}>Yadda saxla</button>
          </div>
        </form>
      ) : null}

      {feedback ? <p className="pickup-feedback" role="status">{feedback}</p> : null}

      <section className="pickup-list" aria-label="Götürülmə nöqtələrinin siyahısı">
        {points.length === 0 ? (
          <p className="pickup-empty">Hələ heç bir nöqtə əlavə edilməyib</p>
        ) : (
          <div className="pickup-card-grid">
            {points.map((point) => (
              <article className="pickup-card" key={point.id}>
                <span className="pickup-card__icon"><Icon name="truck" /></span>
                <div><span className="pickup-card__type">{point.type}</span><h2>{point.name}</h2><p>{point.address}</p></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
