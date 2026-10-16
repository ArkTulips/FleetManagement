

import { useEffect, useMemo, useState } from "react";

import {

  LayoutDashboard,

  Truck,

  Building2,

  Users,

  ShieldCheck,

  Fuel,

  Wrench,

  Route,

  Search,

  Plus,

  Eye,

  Pencil,

  Trash2,

  X,

  ChevronDown,

  Menu,

  ArrowUpRight,

  CircleCheck,

  CircleAlert,

  Clock3

} from "lucide-react";

import "./App.css";



const API = "http://localhost:8081/api";



const navigation = [

  { label: "Overview", icon: LayoutDashboard },

  { label: "Vehicles", icon: Truck },

  { label: "Companies", icon: Building2 },

  { label: "Drivers", icon: Users },

  { label: "Insurance", icon: ShieldCheck },

  { label: "Fuel Records", icon: Fuel },

  { label: "Maintenance", icon: Wrench },

  { label: "Trips", icon: Route }

];



const emptyVehicleForm = {

  companyId: "",

  number: "",

  type: "Truck",

  model: "",

  capacity: "",

  purchaseDate: "",

  status: "ACTIVE"

};



const emptyCompanyForm = {
  companyName: "",
  contactNumber: "",
  email: "",
  address: ""
};

const emptyDriverForm = {
  driverName: "",
  licenseNumber: "",
  phoneNumber: "",
  address: "",
  experienceYears: ""
};

const moduleConfig = {
  Insurance: {
    endpoint: "insurance",
    id: "insuranceId",
    title: "Insurance records",
    fields: [
      { key: "vehicleId", label: "Vehicle", type: "vehicle", required: true },
      { key: "policyNumber", label: "Policy number", required: true, maxLength: 30 },
      { key: "provider", label: "Provider", required: true, maxLength: 50 },
      { key: "startDate", label: "Start date", type: "date", required: true },
      { key: "endDate", label: "End date", type: "date", required: true },
      { key: "premiumAmount", label: "Premium amount", type: "number", min: 0, step: "0.01" }
    ],
    columns: ["vehicleId", "policyNumber", "provider", "startDate", "endDate", "premiumAmount"]
  },
  "Fuel Records": {
    endpoint: "fuel-records",
    id: "fuelId",
    title: "Fuel records",
    fields: [
      { key: "vehicleId", label: "Vehicle", type: "vehicle", required: true },
      { key: "fuelDate", label: "Fuel date", type: "date", required: true },
      { key: "fuelType", label: "Fuel type", type: "select", options: ["Diesel", "Petrol", "CNG", "Electric", "Other"], required: true },
      { key: "quantityLitres", label: "Quantity (litres)", type: "number", required: true, min: 0.01, step: "0.01" },
      { key: "cost", label: "Cost", type: "number", required: true, min: 0, step: "0.01" }
    ],
    columns: ["vehicleId", "fuelDate", "fuelType", "quantityLitres", "cost"]
  },
  Maintenance: {
    endpoint: "maintenance",
    id: "maintenanceId",
    title: "Maintenance records",
    fields: [
      { key: "vehicleId", label: "Vehicle", type: "vehicle", required: true },
      { key: "maintenanceDate", label: "Maintenance date", type: "date", required: true },
      { key: "maintenanceType", label: "Maintenance type", type: "select", options: ["Routine", "Repair", "Inspection", "Tyre", "Engine", "Other"], required: true },
      { key: "description", label: "Description", type: "textarea", maxLength: 100 },
      { key: "cost", label: "Cost", type: "number", required: true, min: 0, step: "0.01" }
    ],
    columns: ["vehicleId", "maintenanceDate", "maintenanceType", "description", "cost"]
  },
  Trips: {
    endpoint: "trips",
    id: "tripId",
    title: "Trip records",
    fields: [
      { key: "vehicleId", label: "Vehicle", type: "vehicle", required: true },
      { key: "driverId", label: "Driver", type: "driver", required: true },
      { key: "source", label: "Source", required: true, maxLength: 50 },
      { key: "destination", label: "Destination", required: true, maxLength: 50 },
      { key: "tripDate", label: "Trip date", type: "date", required: true },
      { key: "distanceKm", label: "Distance (km)", type: "number", min: 0, step: "0.01" }
    ],
    columns: ["vehicleId", "driverId", "source", "destination", "tripDate", "distanceKm"]
  }
};

const recordLabels = {
  vehicleId: "Vehicle",
  driverId: "Driver",
  policyNumber: "Policy number",
  provider: "Provider",
  startDate: "Start date",
  endDate: "End date",
  premiumAmount: "Premium",
  fuelDate: "Fuel date",
  fuelType: "Fuel type",
  quantityLitres: "Litres",
  maintenanceDate: "Maintenance date",
  maintenanceType: "Maintenance type",
  description: "Description",
  cost: "Cost",
  source: "Source",
  destination: "Destination",
  tripDate: "Trip date",
  distanceKm: "Distance (km)"
};

function emptyRecord(config) {
  return Object.fromEntries(config.fields.map((field) => [field.key, ""]));
}



async function apiRequest(url, options = {}) {

  const response = await fetch(url, {

    ...options,

    headers: {

      "Content-Type": "application/json",

      ...options.headers

    }

  });



  const data = await response.json().catch(() => ({}));



  if (!response.ok) {

    throw new Error(data.error || `Request failed (${response.status})`);

  }



  return data;

}



function mapVehicle(vehicle) {

  return {

    id: vehicle.vehicleId,

    companyId: vehicle.companyId,

    number: vehicle.vehicleNumber,

    type: vehicle.vehicleType,

    model: vehicle.model || "",

    capacity: vehicle.seatingCapacity ?? "",

    purchaseDate: vehicle.purchaseDate || "",

    status: vehicle.status || "ACTIVE"

  };

}



function StatusBadge({ status }) {

  const Icon = status === "ACTIVE"

    ? CircleCheck

    : status === "MAINTENANCE"

      ? Clock3

      : CircleAlert;



  return (

    <span className={`status-badge ${(status || "INACTIVE").toLowerCase()}`}>

      <Icon size={13} />

      {status === "ACTIVE"

        ? "Active"

        : status === "MAINTENANCE"

          ? "Maintenance"

          : "Inactive"}

    </span>

  );

}



function App() {

  const [vehicles, setVehicles] = useState([]);

  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [records, setRecords] = useState([]);
  const [recordForm, setRecordForm] = useState({});
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordError, setRecordError] = useState("");

  const [active, setActive] = useState("Overview");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modal, setModal] = useState(null);

  const [editingId, setEditingId] = useState(null);

  const [editingCompanyId, setEditingCompanyId] = useState(null);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [form, setForm] = useState(emptyVehicleForm);

  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [driverForm, setDriverForm] = useState(emptyDriverForm);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [savingDriver, setSavingDriver] = useState(false);
  const [driverLoading, setDriverLoading] = useState(false);
  const [deleteDriverError, setDeleteDriverError] = useState("");

  const [formError, setFormError] = useState("");

  const [apiError, setApiError] = useState("");

  const [savingVehicle, setSavingVehicle] = useState(false);

  const [savingCompany, setSavingCompany] = useState(false);

  const [loading, setLoading] = useState(true);



  async function loadVehicles() {

    const data = await apiRequest(`${API}/vehicles`);

    setVehicles(data.map(mapVehicle));

  }



  async function loadCompanies() {

    const data = await apiRequest(`${API}/companies`);

    setCompanies(data);

  }



  async function loadDrivers() {
    setDriverLoading(true);
    try {
      const data = await apiRequest(`${API}/drivers`);
      setDrivers(data);
      setApiError("");
    } catch (error) {
      setApiError(error.message || "Could not load drivers.");
    } finally {
      setDriverLoading(false);
    }
  }

  async function loadData() {

    setLoading(true);

    setApiError("");



    try {

      const results = await Promise.all([

        apiRequest(`${API}/vehicles`),

        apiRequest(`${API}/companies`)

      ]);



      setVehicles(results[0].map(mapVehicle));

      setCompanies(results[1]);

    } catch (error) {

      setApiError(error.message || "Could not load records from the server.");

    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    loadData();

  }, []);



  useEffect(() => {
    if (active === "Drivers" || active === "Trips") loadDrivers();
    if (moduleConfig[active]) loadModuleRecords(active);
  }, [active]);

  async function loadModuleRecords(page = active) {
    const config = moduleConfig[page];
    if (!config) return;
    setRecordLoading(true);
    setRecordError("");
    try {
      const data = await apiRequest(`${API}/${config.endpoint}`);
      setRecords(data);
    } catch (error) {
      setRecordError(error.message || `Could not load ${page.toLowerCase()}.`);
    } finally {
      setRecordLoading(false);
    }
  }

  function openAddRecord() {
    const config = moduleConfig[active];
    if (!config) return;
    setEditingRecordId(null);
    const next = emptyRecord(config);
    if (config.fields.some((field) => field.key === "vehicleId") && vehicles.length) next.vehicleId = String(vehicles[0].id);
    if (config.fields.some((field) => field.key === "driverId") && drivers.length) next.driverId = String(drivers[0].driverId);
    setRecordForm(next);
    setRecordError("");
    setFormError("");
    setModal("record-form");
  }

  function openEditRecord(record) {
    const config = moduleConfig[active];
    if (!config) return;
    setEditingRecordId(record[config.id]);
    setRecordForm(Object.fromEntries(config.fields.map((field) => [field.key, record[field.key] == null ? "" : String(record[field.key])])));
    setRecordError("");
    setFormError("");
    setModal("record-form");
  }

  async function saveRecord(event) {
    event.preventDefault();
    const config = moduleConfig[active];
    if (!config) return;
    setFormError("");
    const payload = {};
    for (const field of config.fields) {
      const value = recordForm[field.key];
      if (field.required && String(value ?? "").trim() === "") {
        setFormError(`${field.label} is required.`);
        return;
      }
      if (value === "" || value == null) {
        payload[field.key] = null;
      } else if (field.type === "number" || field.type === "vehicle" || field.type === "driver") {
        const number = Number(value);
        if (!Number.isFinite(number) || (field.min != null && number < field.min)) {
          setFormError(`${field.label} must be ${field.min === 0 ? "zero or greater" : "a valid number"}.`);
          return;
        }
        payload[field.key] = number;
      } else {
        payload[field.key] = String(value).trim();
      }
    }
    if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) {
      setFormError("End date cannot be earlier than start date.");
      return;
    }
    setSavingRecord(true);
    try {
      const url = editingRecordId == null ? `${API}/${config.endpoint}` : `${API}/${config.endpoint}/${editingRecordId}`;
      await apiRequest(url, { method: editingRecordId == null ? "POST" : "PUT", body: JSON.stringify(payload) });
      await loadModuleRecords(active);
      setModal(null);
    } catch (error) {
      setFormError(error.message || `Could not save ${active.toLowerCase()} record.`);
    } finally {
      setSavingRecord(false);
    }
  }

  async function deleteRecord(record) {
    const config = moduleConfig[active];
    if (!config) return;
    setRecordError("");
    try {
      await apiRequest(`${API}/${config.endpoint}/${record[config.id]}`, { method: "DELETE" });
      await loadModuleRecords(active);
      setModal(null);
    } catch (error) {
      setRecordError(error.message || `Could not delete ${active.toLowerCase()} record.`);
      setModal({ type: "record-delete", record, message: error.message || "This record is referenced by other records and cannot be deleted." });
    }
  }

  function recordValue(record, key) {
    if (key === "vehicleId") {
      const vehicle = vehicles.find((item) => item.id === record.vehicleId);
      return vehicle ? `${vehicle.number} · ${vehicle.model}` : `Vehicle #${record.vehicleId ?? "—"}`;
    }
    if (key === "driverId") {
      const driver = drivers.find((item) => item.driverId === record.driverId);
      return driver ? driver.driverName : `Driver #${record.driverId ?? "—"}`;
    }
    if (key === "premiumAmount" || key === "cost") return record[key] == null ? "—" : `₹${Number(record[key]).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    if (key === "quantityLitres" || key === "distanceKm") return record[key] == null ? "—" : Number(record[key]).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    return record[key] == null || record[key] === "" ? "—" : record[key];
  }

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => Object.keys(record).some((key) => String(recordValue(record, key)).toLowerCase().includes(query)));
  }, [records, search, vehicles, drivers]);

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return drivers.filter((driver) => [
      driver.driverName,
      driver.licenseNumber,
      driver.phoneNumber,
      driver.address,
      driver.experienceYears
    ].some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [drivers, search]);

  const filteredVehicles = useMemo(() => {

    const query = search.trim().toLowerCase();



    return vehicles.filter((vehicle) => {

      const companyName = companies.find(

        (company) => company.companyId === vehicle.companyId

      )?.companyName || "";



      const matchesSearch = [

        vehicle.number,

        vehicle.type,

        vehicle.model,

        vehicle.status,

        companyName

      ].some((value) => String(value ?? "").toLowerCase().includes(query));



      const matchesStatus = statusFilter === "ALL" || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;

    });

  }, [vehicles, search, statusFilter, companies]);



  const filteredCompanies = useMemo(() => {

    const query = search.trim().toLowerCase();



    return companies.filter((company) => [

      company.companyName,

      company.contactNumber,

      company.email,

      company.address

    ].some((value) => String(value ?? "").toLowerCase().includes(query)));

  }, [companies, search]);



  const activeCount = vehicles.filter((v) => v.status === "ACTIVE").length;

  const maintenanceCount = vehicles.filter((v) => v.status === "MAINTENANCE").length;

  const inactiveCount = vehicles.filter((v) => v.status === "INACTIVE").length;



  function changePage(page) {

    setActive(page);

    setMobileOpen(false);

    setSearch("");

    setStatusFilter("ALL");

    setApiError("");

  }



  function openAddVehicle() {

    setEditingId(null);

    setForm({

      ...emptyVehicleForm,

      companyId: companies.length ? String(companies[0].companyId) : ""

    });

    setFormError("");

    setApiError("");

    setModal("vehicle-form");

  }



  function openEditVehicle(vehicle) {

    setEditingId(vehicle.id);

    setForm({

      companyId: String(vehicle.companyId ?? ""),

      number: vehicle.number || "",

      type: vehicle.type || "Truck",

      model: vehicle.model || "",

      capacity: String(vehicle.capacity ?? ""),

      purchaseDate: vehicle.purchaseDate || "",

      status: vehicle.status || "ACTIVE"

    });

    setFormError("");

    setApiError("");

    setModal("vehicle-form");

  }



  async function saveVehicle(event) {

    event.preventDefault();

    setFormError("");

    setApiError("");



    if (!form.companyId) {

      setFormError("Select a company before saving.");

      return;

    }



    if (!form.number.trim() || !form.model.trim() || !form.capacity) {

      setFormError("Complete the registration, model and capacity fields.");

      return;

    }



    const capacity = Number(form.capacity);



    if (!Number.isFinite(capacity) || capacity <= 0) {

      setFormError("Capacity must be a positive number.");

      return;

    }



    const registration = form.number.trim().toUpperCase();

    const duplicate = vehicles.some(

      (vehicle) => vehicle.number.toUpperCase() === registration && vehicle.id !== editingId

    );



    if (duplicate) {

      setFormError("A vehicle with this registration already exists.");

      return;

    }



    const vehicleData = {

      companyId: Number(form.companyId),

      vehicleNumber: registration,

      vehicleType: form.type,

      model: form.model.trim(),

      seatingCapacity: capacity,

      purchaseDate: form.purchaseDate || null,

      status: form.status

    };



    setSavingVehicle(true);



    try {

      if (editingId !== null) {

        await apiRequest(`${API}/vehicles/${editingId}`, {

          method: "PUT",

          body: JSON.stringify(vehicleData)

        });

      } else {

        await apiRequest(`${API}/vehicles`, {

          method: "POST",

          body: JSON.stringify(vehicleData)

        });

      }



      await loadVehicles();

      setModal(null);

    } catch (error) {

      setFormError(error.message || "Could not save vehicle.");

    } finally {

      setSavingVehicle(false);

    }

  }



  async function deleteVehicle(id) {

    const vehicle = vehicles.find((item) => item.id === id);

    if (!vehicle || !window.confirm(`Delete vehicle ${vehicle.number}?`)) return;



    setApiError("");



    try {

      await apiRequest(`${API}/vehicles/${id}`, { method: "DELETE" });

      await loadVehicles();

      if (modal?.vehicle?.id === id) setModal(null);

    } catch (error) {

      setApiError(error.message || "Could not delete vehicle.");

    }

  }



  function openAddCompany() {

    setEditingCompanyId(null);

    setCompanyForm(emptyCompanyForm);

    setFormError("");

    setApiError("");

    setModal("company-form");

  }



  function openEditCompany(company) {

    setEditingCompanyId(company.companyId);

    setCompanyForm({

      companyName: company.companyName || "",

      contactNumber: company.contactNumber || "",

      email: company.email || "",

      address: company.address || ""

    });

    setFormError("");

    setApiError("");

    setModal("company-form");

  }



  async function saveCompany(event) {

    event.preventDefault();

    setFormError("");

    setApiError("");



    const companyName = companyForm.companyName.trim();



    if (!companyName) {

      setFormError("Company name is required.");

      return;

    }



    const companyData = {

      companyName,

      contactNumber: companyForm.contactNumber.trim() || null,

      email: companyForm.email.trim() || null,

      address: companyForm.address.trim() || null

    };



    setSavingCompany(true);



    try {

      if (editingCompanyId !== null) {

        await apiRequest(`${API}/companies/${editingCompanyId}`, {

          method: "PUT",

          body: JSON.stringify(companyData)

        });

      } else {

        await apiRequest(`${API}/companies`, {

          method: "POST",

          body: JSON.stringify(companyData)

        });

      }



      await Promise.all([loadCompanies(), loadVehicles()]);

      setModal(null);

    } catch (error) {

      setFormError(error.message || "Could not save company.");

    } finally {

      setSavingCompany(false);

    }

  }



  async function deleteCompany(company) {

    if (!window.confirm(`Delete company "${company.companyName}"?`)) return;



    setApiError("");



    try {

      await apiRequest(`${API}/companies/${company.companyId}`, {

        method: "DELETE"

      });

      await Promise.all([loadCompanies(), loadVehicles()]);

    } catch (error) {

      setApiError(error.message || "Could not delete company.");

    }

  }



  function openAddDriver() {
    setEditingDriverId(null);
    setDriverForm(emptyDriverForm);
    setFormError("");
    setApiError("");
    setModal("driver-form");
  }

  function openEditDriver(driver) {
    setEditingDriverId(driver.driverId);
    setDriverForm({
      driverName: driver.driverName || "",
      licenseNumber: driver.licenseNumber || "",
      phoneNumber: driver.phoneNumber || "",
      address: driver.address || "",
      experienceYears: driver.experienceYears == null ? "" : String(driver.experienceYears)
    });
    setFormError("");
    setApiError("");
    setModal("driver-form");
  }

  async function saveDriver(event) {
    event.preventDefault();
    setFormError("");
    const driverName = driverForm.driverName.trim();
    const licenseNumber = driverForm.licenseNumber.trim().toUpperCase();
    const experienceYears = driverForm.experienceYears === "" ? null : Number(driverForm.experienceYears);

    if (!driverName || !licenseNumber) {
      setFormError("Driver name and license number are required.");
      return;
    }
    if (experienceYears !== null && (!Number.isInteger(experienceYears) || experienceYears < 0)) {
      setFormError("Experience must be a non-negative whole number.");
      return;
    }
    if (drivers.some((driver) => driver.licenseNumber?.toUpperCase() === licenseNumber && driver.driverId !== editingDriverId)) {
      setFormError("A driver with this license number already exists.");
      return;
    }

    const driverData = {
      driverName,
      licenseNumber,
      phoneNumber: driverForm.phoneNumber.trim() || null,
      address: driverForm.address.trim() || null,
      experienceYears
    };

    setSavingDriver(true);
    try {
      if (editingDriverId !== null) {
        await apiRequest(`${API}/drivers/${editingDriverId}`, {
          method: "PUT",
          body: JSON.stringify(driverData)
        });
      } else {
        await apiRequest(`${API}/drivers`, {
          method: "POST",
          body: JSON.stringify(driverData)
        });
      }
      await loadDrivers();
      setModal(null);
    } catch (error) {
      setFormError(error.message || "Could not save driver.");
    } finally {
      setSavingDriver(false);
    }
  }

  function requestDeleteDriver(driver) {
    setDeleteDriverError("");
    setModal({ type: "driver-delete", driver });
  }

  async function confirmDeleteDriver() {
    if (!modal?.driver) return;
    setDeleteDriverError("");
    try {
      await apiRequest(`${API}/drivers/${modal.driver.driverId}`, { method: "DELETE" });
      await loadDrivers();
      setModal(null);
    } catch (error) {
      setDeleteDriverError(error.message || "Could not delete driver. Related records may still exist.");
    }
  }

  const isVehiclePage = active === "Vehicles" || active === "Overview";



  return (

    <div className="app-shell">

      {mobileOpen && (

        <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />

      )}



      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>

        <button className="brand" onClick={() => changePage("Overview")}>

          <span className="brand-mark"><Wrench size={21} /></span>

          <span className="brand-copy"><strong>Fleetari's</strong><small>FLEET MANAGEMENT</small></span>

        </button>



        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">

          {navigation.map(({ label, icon: Icon }) => (

            <button key={label} className={`nav-link ${active === label ? "selected" : ""}`} onClick={() => changePage(label)}>

              <Icon size={18} strokeWidth={1.8} />

              <span>{label}</span>

              {active === label && <span className="nav-indicator" />}

            </button>

          ))}

        </nav>



        <div className="sidebar-bottom">

        </div>

      </aside>



      <main className="main-area">

        



        <div className="page-content">

          <div className="page-heading">

            <div>

              <h1>{active === "Overview" ? "Fleet overview" : active}</h1>

              <p>

                {active === "Overview"

                  ? ""

                  : active === "Vehicles"

                    ? ""

                    : active === "Companies"

                      ? ""

                      : `Manage your fleet's ${active.toLowerCase()} records.`}

              </p>

            </div>

            {isVehiclePage && <button className="primary-button" onClick={openAddVehicle} disabled={loading || companies.length === 0}><Plus size={17} /> Add vehicle</button>}

            {active === "Companies" && <button className="primary-button" onClick={openAddCompany} disabled={loading}><Plus size={17} /> Add company</button>}
            {active === "Drivers" && <button className="primary-button" onClick={openAddDriver} disabled={driverLoading}><Plus size={17} /> Add driver</button>}

          </div>



          {apiError && <div className="form-error" role="alert">{apiError} <button type="button" onClick={loadData} disabled={loading}>Retry</button></div>}

          {loading && <p>Loading records from Oracle...</p>}



          {isVehiclePage ? (

            <>

              <section className="stats-grid">

                <article className="stat-card"><div className="stat-label">Total vehicles</div><div className="stat-bottom"><strong className="stat-number">{vehicles.length}</strong><span className="stat-caption">Registered</span></div></article>

                <article className="stat-card"><div className="stat-label">Active vehicles</div><div className="stat-bottom"><strong className="stat-number">{activeCount}</strong><span className="stat-caption teal-text">In service</span></div></article>

                <article className="stat-card"><div className="stat-label">In maintenance</div><div className="stat-bottom"><strong className="stat-number">{maintenanceCount}</strong><span className="stat-caption amber-text">Needs attention</span></div></article>

                <article className="stat-card"><div className="stat-label">Inactive vehicles</div><div className="stat-bottom"><strong className="stat-number">{inactiveCount}</strong><span className="stat-caption">Out of service</span></div></article>

              </section>



              {active === "Overview" && (

                <section className="overview-strip">

                  <div className="overview-strip-title">

                    <div><span className="section-kicker">FLEET STATUS</span><h2>Vehicle availability</h2></div>

                    <button className="text-button" onClick={() => changePage("Vehicles")}>View all vehicles <ArrowUpRight size={15} /></button>

                  </div>

                  <div className="availability-bar">

                    <span className="availability-active" style={{ width: `${vehicles.length ? activeCount / vehicles.length * 100 : 0}%` }} />

                    <span className="availability-maintenance" style={{ width: `${vehicles.length ? maintenanceCount / vehicles.length * 100 : 0}%` }} />

                    <span className="availability-inactive" style={{ width: `${vehicles.length ? inactiveCount / vehicles.length * 100 : 0}%` }} />

                  </div>

                  <div className="availability-legend">

                    <span><i className="legend-dot teal-dot" /> Active <strong>{activeCount}</strong></span>

                    <span><i className="legend-dot amber-dot" /> Maintenance <strong>{maintenanceCount}</strong></span>

                    <span><i className="legend-dot gray-dot" /> Inactive <strong>{inactiveCount}</strong></span>

                  </div>

                </section>

              )}



              <section className="content-card">

                <div className="table-header">

                  <div><h2>{active === "Overview" ? "Recent vehicles" : "Vehicle records"}</h2><p>{filteredVehicles.length} {filteredVehicles.length === 1 ? "record" : "records"}</p></div>

                  <div className="table-controls">

                    <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicles" aria-label="Search vehicles" />{search && <button type="button" className="clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</label>

                    <label className="filter-field"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="MAINTENANCE">Maintenance</option><option value="INACTIVE">Inactive</option></select><ChevronDown size={14} /></label>

                  </div>

                </div>

                <div className="table-scroll">

                  <table className="vehicle-table">

                    <thead><tr><th>Registration</th><th>Vehicle</th><th>Capacity</th><th>Status</th><th className="actions-heading">Actions</th></tr></thead>

                    <tbody>

                      {filteredVehicles.length > 0 ? filteredVehicles.map((vehicle) => {

                        const companyName = companies.find((company) => company.companyId === vehicle.companyId)?.companyName;

                        return <tr key={vehicle.id}>

                          <td><span className="registration-number">{vehicle.number}</span><span className="registration-id">ID #{vehicle.id}</span></td>

                          <td><div className="vehicle-name">{vehicle.model}</div><div className="vehicle-type">{vehicle.type}{companyName ? ` · ${companyName}` : ""}</div></td>

                          <td><span className="capacity-value">{vehicle.capacity}</span><span className="capacity-unit">{vehicle.type === "Bus" ? "seats" : "capacity"}</span></td>

                          <td><StatusBadge status={vehicle.status} /></td>

                          <td><div className="row-actions">

                            <button type="button" aria-label={`View ${vehicle.number}`} title="View" onClick={() => setModal({ type: "view", vehicle })}><Eye size={16} /></button>

                            <button type="button" aria-label={`Edit ${vehicle.number}`} title="Edit" onClick={() => openEditVehicle(vehicle)}><Pencil size={16} /></button>

                            <button type="button" className="delete-action" aria-label={`Delete ${vehicle.number}`} title="Delete" onClick={() => deleteVehicle(vehicle.id)}><Trash2 size={16} /></button>

                          </div></td>

                        </tr>;

                      }) : <tr><td colSpan="5"><div className="empty-state"><Search size={22} /><strong>{loading ? "Loading vehicles..." : "No vehicles found"}</strong><span>{loading ? "Fetching records from Oracle." : "Try another search or change the status filter."}</span></div></td></tr>}

                    </tbody>

                  </table>

                </div>

                <div className="table-footer"><span>Showing {filteredVehicles.length} of {vehicles.length} vehicles</span><span className="local-data-label">Saved in Oracle Database</span></div>

              </section>

            </>

          ) : active === "Companies" ? (

            <section className="content-card">

              <div className="table-header">

                <div><h2>Company records</h2><p>{filteredCompanies.length} registered {filteredCompanies.length === 1 ? "company" : "companies"}</p></div>

                <div className="table-controls">

                  <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search companies" aria-label="Search companies" />{search && <button type="button" className="clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</label>

                </div>

              </div>

              <div className="table-scroll">

                <table className="vehicle-table">

                  <thead><tr><th>Company</th><th>Contact number</th><th>Email</th><th>Address</th><th className="actions-heading">Actions</th></tr></thead>

                  <tbody>

                    {filteredCompanies.length > 0 ? filteredCompanies.map((company) => <tr key={company.companyId}>

                      <td><span className="registration-number">{company.companyName}</span><span className="registration-id">ID #{company.companyId}</span></td>

                      <td>{company.contactNumber || "—"}</td>

                      <td>{company.email || "—"}</td>

                      <td>{company.address || "—"}</td>

                      <td><div className="row-actions">

                        <button type="button" aria-label={`View ${company.companyName}`} title="View" onClick={() => setModal({ type: "company-view", company })}><Eye size={16} /></button>

                        <button type="button" aria-label={`Edit ${company.companyName}`} title="Edit" onClick={() => openEditCompany(company)}><Pencil size={16} /></button>

                        <button type="button" className="delete-action" aria-label={`Delete ${company.companyName}`} title="Delete" onClick={() => deleteCompany(company)}><Trash2 size={16} /></button>

                      </div></td>

                    </tr>) : <tr><td colSpan="5"><div className="empty-state"><Search size={22} /><strong>{loading ? "Loading companies..." : "No companies found"}</strong><span>{loading ? "Fetching records from Oracle." : "Try another search or add a company."}</span></div></td></tr>}

                  </tbody>

                </table>

              </div>

              <div className="table-footer"><span>Showing {filteredCompanies.length} of {companies.length} companies</span><span className="local-data-label">Saved in Oracle Database</span></div>

            </section>

          ) : active === "Drivers" ? (
            <section className="content-card">
              <div className="table-header">
                <div><h2>Driver records</h2><p>{filteredDrivers.length} registered {filteredDrivers.length === 1 ? "driver" : "drivers"}</p></div>
                <div className="table-controls">
                  <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search drivers" aria-label="Search drivers" />{search && <button type="button" className="clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</label>
                </div>
              </div>
              <div className="table-scroll">
                <table className="vehicle-table">
                  <thead><tr><th>Driver</th><th>License number</th><th>Phone</th><th>Experience</th><th className="actions-heading">Actions</th></tr></thead>
                  <tbody>
                    {filteredDrivers.length > 0 ? filteredDrivers.map((driver) => (
                      <tr key={driver.driverId}>
                        <td><span className="registration-number">{driver.driverName}</span><span className="registration-id">ID #{driver.driverId}</span></td>
                        <td>{driver.licenseNumber}</td>
                        <td>{driver.phoneNumber || "—"}</td>
                        <td>{driver.experienceYears == null ? "—" : `${driver.experienceYears} years`}</td>
                        <td><div className="row-actions">
                          <button type="button" aria-label={`View ${driver.driverName}`} title="View" onClick={() => setModal({ type: "driver-view", driver })}><Eye size={16} /></button>
                          <button type="button" aria-label={`Edit ${driver.driverName}`} title="Edit" onClick={() => openEditDriver(driver)}><Pencil size={16} /></button>
                          <button type="button" className="delete-action" aria-label={`Delete ${driver.driverName}`} title="Delete" onClick={() => requestDeleteDriver(driver)}><Trash2 size={16} /></button>
                        </div></td>
                      </tr>
                    )) : <tr><td colSpan="5"><div className="empty-state"><Search size={22} /><strong>{driverLoading ? "Loading drivers..." : "No drivers found"}</strong><span>{driverLoading ? "Fetching records from Oracle." : "Try another search or add a driver."}</span></div></td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="table-footer"><span>Showing {filteredDrivers.length} of {drivers.length} drivers</span><span className="local-data-label">Saved in Oracle Database</span></div>
            </section>
          ) : moduleConfig[active] ? (
            <section className="content-card">
              <div className="table-header">
                <div><h2>{moduleConfig[active].title}</h2><p>{filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}</p></div>
                <div className="table-controls">
                  <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${active.toLowerCase()}`} aria-label={`Search ${active}`} />{search && <button type="button" className="clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</label>
                  <button type="button" className="primary-button" onClick={openAddRecord}><Plus size={16} /> Add record</button>
                </div>
              </div>
              {recordError && <p className="form-error" role="alert">{recordError}</p>}
              <div className="table-scroll">
                <table className="vehicle-table">
                  <thead><tr>{moduleConfig[active].columns.map((key) => <th key={key}>{recordLabels[key] || key}</th>)}<th className="actions-heading">Actions</th></tr></thead>
                  <tbody>
                    {filteredRecords.length ? filteredRecords.map((record) => <tr key={record[moduleConfig[active].id]}>
                      {moduleConfig[active].columns.map((key) => <td key={key}>{key === moduleConfig[active].columns[0] ? <><span className="registration-number">{recordValue(record, key)}</span><span className="registration-id">ID #{record[moduleConfig[active].id]}</span></> : recordValue(record, key)}</td>)}
                      <td><div className="row-actions">
                        <button type="button" title="View" aria-label="View record" onClick={() => setModal({ type: "record-view", record, page: active })}><Eye size={16} /></button>
                        <button type="button" title="Edit" aria-label="Edit record" onClick={() => openEditRecord(record)}><Pencil size={16} /></button>
                        <button type="button" className="delete-action" title="Delete" aria-label="Delete record" onClick={() => setModal({ type: "record-delete", record, page: active, message: "This record may be linked to other fleet records. Related records will not be removed." })}><Trash2 size={16} /></button>
                      </div></td>
                    </tr>) : <tr><td colSpan={moduleConfig[active].columns.length + 1}><div className="empty-state"><Search size={22} /><strong>{recordLoading ? "Loading records..." : "No records found"}</strong><span>{recordLoading ? "Fetching records from Oracle." : "Add a record or try another search."}</span></div></td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="table-footer"><span>Showing {filteredRecords.length} of {records.length} records</span><span className="local-data-label">Saved in Oracle Database</span></div>
            </section>
          ) : null}




        </div>

      </main>



      {modal === "vehicle-form" && (

        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingVehicle) setModal(null); }}>

          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title">

            <div className="modal-header"><div><span className="section-kicker">{editingId !== null ? "UPDATE RECORD" : "NEW RECORD"}</span><h2 id="vehicle-form-title">{editingId !== null ? "Edit vehicle" : "Add vehicle"}</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog" disabled={savingVehicle}><X size={19} /></button></div>

            <form onSubmit={saveVehicle}>

              <div className="form-grid">

                <label className="form-field form-field-wide"><span>Company</span><select value={form.companyId} onChange={(event) => setForm({ ...form, companyId: event.target.value })} required><option value="">Select company</option>{companies.map((company) => <option key={company.companyId} value={company.companyId}>{company.companyName}</option>)}</select></label>

                <label className="form-field form-field-wide"><span>Registration number</span><input value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} placeholder="e.g. TN23AB1234" maxLength={20} required autoFocus /></label>

                <label className="form-field"><span>Vehicle type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Truck</option><option>Bus</option><option>Van</option><option>Car</option><option>Other</option></select></label>

                <label className="form-field"><span>Capacity</span><input type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} placeholder="e.g. 16" required /></label>

                <label className="form-field form-field-wide"><span>Make and model</span><input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="e.g. Tata Prima" maxLength={50} required /></label>

                <label className="form-field form-field-wide"><span>Purchase date</span><input type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} /></label>

                <label className="form-field form-field-wide"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Active</option><option value="MAINTENANCE">Maintenance</option><option value="INACTIVE">Inactive</option></select></label>

              </div>

              {formError && <p className="form-error" role="alert">{formError}</p>}

              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)} disabled={savingVehicle}>Cancel</button><button type="submit" className="primary-button" disabled={savingVehicle || loading}>{savingVehicle ? "Saving..." : editingId !== null ? "Save changes" : "Add vehicle"}</button></div>

            </form>

          </section>

        </div>

      )}



      {modal === "company-form" && (

        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingCompany) setModal(null); }}>

          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="company-form-title">

            <div className="modal-header"><div><span className="section-kicker">{editingCompanyId !== null ? "UPDATE RECORD" : "NEW RECORD"}</span><h2 id="company-form-title">{editingCompanyId !== null ? "Edit company" : "Add company"}</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog" disabled={savingCompany}><X size={19} /></button></div>

            <form onSubmit={saveCompany}>

              <div className="form-grid">

                <label className="form-field form-field-wide"><span>Company name</span><input value={companyForm.companyName} onChange={(event) => setCompanyForm({ ...companyForm, companyName: event.target.value })} placeholder="e.g. Vellore Transport Services" maxLength={100} required autoFocus /></label>

                <label className="form-field form-field-wide"><span>Contact number</span><input type="tel" value={companyForm.contactNumber} onChange={(event) => setCompanyForm({ ...companyForm, contactNumber: event.target.value })} placeholder="e.g. 9876543210" maxLength={20} /></label>

                <label className="form-field form-field-wide"><span>Email</span><input type="email" value={companyForm.email} onChange={(event) => setCompanyForm({ ...companyForm, email: event.target.value })} placeholder="e.g. contact@company.com" maxLength={100} /></label>

                <label className="form-field form-field-wide"><span>Address</span><textarea rows={3} value={companyForm.address} onChange={(event) => setCompanyForm({ ...companyForm, address: event.target.value })} placeholder="Company address" maxLength={250} /></label>

              </div>

              {formError && <p className="form-error" role="alert">{formError}</p>}

              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)} disabled={savingCompany}>Cancel</button><button type="submit" className="primary-button" disabled={savingCompany}>{savingCompany ? "Saving..." : editingCompanyId !== null ? "Save changes" : "Add company"}</button></div>

            </form>

          </section>

        </div>

      )}



      {modal?.type === "view" && (

        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>

          <section className="modal-panel view-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-view-title">

            <div className="modal-header"><div><span className="section-kicker">VEHICLE DETAILS</span><h2 id="vehicle-view-title">{modal.vehicle.number}</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog"><X size={19} /></button></div>

            <div className="detail-list">

              <div><span>Registration ID</span><strong>#{modal.vehicle.id}</strong></div>

              <div><span>Company</span><strong>{companies.find((company) => company.companyId === modal.vehicle.companyId)?.companyName || "—"}</strong></div>

              <div><span>Vehicle type</span><strong>{modal.vehicle.type}</strong></div>

              <div><span>Make and model</span><strong>{modal.vehicle.model}</strong></div>

              <div><span>Capacity</span><strong>{modal.vehicle.capacity} {modal.vehicle.type === "Bus" ? "seats" : "capacity"}</strong></div>

              <div><span>Purchase date</span><strong>{modal.vehicle.purchaseDate || "—"}</strong></div>

              <div><span>Status</span><StatusBadge status={modal.vehicle.status} /></div>

            </div>

            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Close</button><button type="button" className="primary-button" onClick={() => openEditVehicle(modal.vehicle)}><Pencil size={15} /> Edit vehicle</button></div>

          </section>

        </div>

      )}



      {modal === "driver-form" && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingDriver) setModal(null); }}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="driver-form-title">
            <div className="modal-header"><div><span className="section-kicker">{editingDriverId !== null ? "UPDATE RECORD" : "NEW RECORD"}</span><h2 id="driver-form-title">{editingDriverId !== null ? "Edit driver" : "Add driver"}</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog" disabled={savingDriver}><X size={19} /></button></div>
            <form onSubmit={saveDriver}>
              <div className="form-grid">
                <label className="form-field form-field-wide"><span>Driver name</span><input value={driverForm.driverName} onChange={(event) => setDriverForm({ ...driverForm, driverName: event.target.value })} placeholder="e.g. Arjun Kumar" maxLength={50} required autoFocus /></label>
                <label className="form-field form-field-wide"><span>License number</span><input value={driverForm.licenseNumber} onChange={(event) => setDriverForm({ ...driverForm, licenseNumber: event.target.value })} placeholder="Enter driving license number" maxLength={30} required /></label>
                <label className="form-field form-field-wide"><span>Phone number</span><input type="tel" value={driverForm.phoneNumber} onChange={(event) => setDriverForm({ ...driverForm, phoneNumber: event.target.value })} placeholder="e.g. 9876543210" maxLength={15} /></label>
                <label className="form-field form-field-wide"><span>Experience (years)</span><input type="number" min="0" step="1" value={driverForm.experienceYears} onChange={(event) => setDriverForm({ ...driverForm, experienceYears: event.target.value })} placeholder="e.g. 5" /></label>
                <label className="form-field form-field-wide"><span>Address</span><textarea rows={3} value={driverForm.address} onChange={(event) => setDriverForm({ ...driverForm, address: event.target.value })} placeholder="Driver address" maxLength={100} /></label>
              </div>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)} disabled={savingDriver}>Cancel</button><button type="submit" className="primary-button" disabled={savingDriver}>{savingDriver ? "Saving..." : editingDriverId !== null ? "Save changes" : "Add driver"}</button></div>
            </form>
          </section>
        </div>
      )}

      {modal?.type === "driver-view" && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className="modal-panel view-modal" role="dialog" aria-modal="true" aria-labelledby="driver-view-title">
            <div className="modal-header"><div><span className="section-kicker">DRIVER DETAILS</span><h2 id="driver-view-title">{modal.driver.driverName}</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog"><X size={19} /></button></div>
            <div className="detail-list">
              <div><span>Driver ID</span><strong>#{modal.driver.driverId}</strong></div>
              <div><span>Driver name</span><strong>{modal.driver.driverName}</strong></div>
              <div><span>License number</span><strong>{modal.driver.licenseNumber}</strong></div>
              <div><span>Phone number</span><strong>{modal.driver.phoneNumber || "—"}</strong></div>
              <div><span>Experience</span><strong>{modal.driver.experienceYears == null ? "—" : `${modal.driver.experienceYears} years`}</strong></div>
              <div><span>Address</span><strong>{modal.driver.address || "—"}</strong></div>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Close</button><button type="button" className="primary-button" onClick={() => openEditDriver(modal.driver)}><Pencil size={15} /> Edit driver</button></div>
          </section>
        </div>
      )}

      {modal?.type === "driver-delete" && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className="modal-panel view-modal" role="dialog" aria-modal="true" aria-labelledby="driver-delete-title">
            <div className="modal-header"><div><span className="section-kicker">CAUTION · DELETE RECORD</span><h2 id="driver-delete-title">Delete {modal.driver.driverName}?</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog"><X size={19} /></button></div>
            <div className="form-error" role="note"><strong>Important:</strong> This driver may be linked to existing trips or other fleet records. If related records exist, the driver cannot be deleted. Those records will not be removed.</div>
            <p>Are you sure you want to attempt to delete this driver?</p>
            {deleteDriverError && <p className="form-error" role="alert">{deleteDriverError}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button type="button" className="primary-button delete-confirm-button" onClick={confirmDeleteDriver}>Delete driver</button></div>
          </section>
        </div>
      )}

      {modal?.type === "company-view" && (

        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>

          <section className="modal-panel view-modal" role="dialog" aria-modal="true" aria-labelledby="company-view-title">

            <div className="modal-header"><div><span className="section-kicker">COMPANY DETAILS</span><h2 id="company-view-title">{modal.company.companyName}</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog"><X size={19} /></button></div>

            <div className="detail-list">

              <div><span>Company ID</span><strong>#{modal.company.companyId}</strong></div>

              <div><span>Company name</span><strong>{modal.company.companyName}</strong></div>

              <div><span>Contact number</span><strong>{modal.company.contactNumber || "—"}</strong></div>

              <div><span>Email</span><strong>{modal.company.email || "—"}</strong></div>

              <div><span>Address</span><strong>{modal.company.address || "—"}</strong></div>

            </div>

            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Close</button><button type="button" className="primary-button" onClick={() => openEditCompany(modal.company)}><Pencil size={15} /> Edit company</button></div>

          </section>

        </div>

      )}


      {modal === "record-form" && moduleConfig[active] && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingRecord) setModal(null); }}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="record-form-title">
            <div className="modal-header"><div><span className="section-kicker">{editingRecordId == null ? "NEW RECORD" : "UPDATE RECORD"}</span><h2 id="record-form-title">{editingRecordId == null ? "Add" : "Edit"} {active === "Fuel Records" ? "fuel record" : active === "Trips" ? "trip" : active === "Maintenance" ? "maintenance record" : "insurance policy"}</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog" disabled={savingRecord}><X size={19} /></button></div>
            <form onSubmit={saveRecord}>
              <div className="form-grid">
                {moduleConfig[active].fields.map((field) => <label className={`form-field ${field.type === "textarea" ? "form-field-wide" : ""}`} key={field.key}><span>{field.label}</span>
                  {field.type === "vehicle" ? <select value={recordForm[field.key] || ""} onChange={(event) => setRecordForm({ ...recordForm, [field.key]: event.target.value })} required={field.required}><option value="">Select vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.number} · {vehicle.model}</option>)}</select>
                    : field.type === "driver" ? <select value={recordForm[field.key] || ""} onChange={(event) => setRecordForm({ ...recordForm, [field.key]: event.target.value })} required={field.required}><option value="">Select driver</option>{drivers.map((driver) => <option key={driver.driverId} value={driver.driverId}>{driver.driverName} · {driver.licenseNumber}</option>)}</select>
                    : field.type === "select" ? <select value={recordForm[field.key] || ""} onChange={(event) => setRecordForm({ ...recordForm, [field.key]: event.target.value })} required={field.required}><option value="">Select {field.label.toLowerCase()}</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                    : field.type === "textarea" ? <textarea rows={3} value={recordForm[field.key] || ""} onChange={(event) => setRecordForm({ ...recordForm, [field.key]: event.target.value })} maxLength={field.maxLength} />
                    : <input type={field.type || "text"} value={recordForm[field.key] || ""} onChange={(event) => setRecordForm({ ...recordForm, [field.key]: event.target.value })} required={field.required} maxLength={field.maxLength} min={field.min} step={field.step} />}
                </label>)}
              </div>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)} disabled={savingRecord}>Cancel</button><button type="submit" className="primary-button" disabled={savingRecord || !vehicles.length || (active === "Trips" && !drivers.length)}>{savingRecord ? "Saving..." : editingRecordId == null ? "Add record" : "Save changes"}</button></div>
            </form>
          </section>
        </div>
      )}

      {modal?.type === "record-view" && moduleConfig[modal.page] && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className="modal-panel view-modal" role="dialog" aria-modal="true" aria-labelledby="record-view-title">
            <div className="modal-header"><div><span className="section-kicker">RECORD DETAILS</span><h2 id="record-view-title">{moduleConfig[modal.page].title}</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog"><X size={19} /></button></div>
            <div className="detail-list">{moduleConfig[modal.page].fields.map((field) => <div key={field.key}><span>{field.label}</span><strong>{recordValue(modal.record, field.key)}</strong></div>)}</div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Close</button><button type="button" className="primary-button" onClick={() => { setActive(modal.page); openEditRecord(modal.record); }}><Pencil size={15} /> Edit record</button></div>
          </section>
        </div>
      )}

      {modal?.type === "record-delete" && moduleConfig[modal.page || active] && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className="modal-panel view-modal" role="dialog" aria-modal="true" aria-labelledby="record-delete-title">
            <div className="modal-header"><div><span className="section-kicker">CAUTION · DELETE RECORD</span><h2 id="record-delete-title">Delete this record?</h2></div><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog"><X size={19} /></button></div>
            <p>{modal.message}</p>
            {recordError && <p className="form-error" role="alert">{recordError}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setRecordError(""); setModal(null); }}>Cancel</button><button type="button" className="primary-button delete-confirm-button" onClick={() => { setActive(modal.page || active); deleteRecord(modal.record); }}>Delete record</button></div>
          </section>
        </div>
      )}

    </div>

  );

}



export default App;
