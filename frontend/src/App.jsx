
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

function mapDriver(driver) {
  return {
    id: driver.driverId,
    driverName: driver.driverName || "",
    licenseNumber: driver.licenseNumber || "",
    phoneNumber: driver.phoneNumber || "",
    address: driver.address || "",
    experienceYears: driver.experienceYears ?? ""
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
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modal, setModal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [form, setForm] = useState(emptyVehicleForm);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [driverForm, setDriverForm] = useState(emptyDriverForm);
  const [formError, setFormError] = useState("");
  const [apiError, setApiError] = useState("");
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingDriver, setSavingDriver] = useState(false);
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
    const data = await apiRequest(`${API}/drivers`);
    setDrivers(data.map(mapDriver));
  }

  async function loadData() {
    setLoading(true);
    setApiError("");

    try {
      const results = await Promise.all([
        apiRequest(`${API}/vehicles`),
        apiRequest(`${API}/companies`),
        apiRequest(`${API}/drivers`)
      ]);

      setVehicles(results[0].map(mapVehicle));
      setCompanies(results[1]);
      setDrivers(results[2].map(mapDriver));
    } catch (error) {
      setApiError(error.message || "Could not load records from the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vehicles.filter(vehicle => {
      const companyName = companies.find(
        company => company.companyId === vehicle.companyId
      )?.companyName || "";

      const matchesSearch = [
        vehicle.number,
        vehicle.type,
        vehicle.model,
        vehicle.status,
        companyName
      ].some(value => String(value ?? "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "ALL" || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, search, statusFilter, companies]);

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return companies.filter(company => [
      company.companyName,
      company.contactNumber,
      company.email,
      company.address
    ].some(value => String(value ?? "").toLowerCase().includes(query)));
  }, [companies, search]);

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return drivers.filter(driver => [
      driver.driverName,
      driver.licenseNumber,
      driver.phoneNumber,
      driver.address,
      driver.experienceYears
    ].some(value => String(value ?? "").toLowerCase().includes(query)));
  }, [drivers, search]);

  const activeCount = vehicles.filter(v => v.status === "ACTIVE").length;
  const maintenanceCount = vehicles.filter(v => v.status === "MAINTENANCE").length;
  const inactiveCount = vehicles.filter(v => v.status === "INACTIVE").length;

  function changePage(page) {
    setActive(page);
    setMobileOpen(false);
    setSearch("");
    setStatusFilter("ALL");
    setApiError("");
    setFormError("");
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
      vehicle => vehicle.number.toUpperCase() === registration &&
        vehicle.id !== editingId
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
    const vehicle = vehicles.find(item => item.id === id);

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
    setEditingDriverId(driver.id);
    setDriverForm({
      driverName: driver.driverName,
      licenseNumber: driver.licenseNumber,
      phoneNumber: driver.phoneNumber,
      address: driver.address,
      experienceYears: String(driver.experienceYears ?? "")
    });
    setFormError("");
    setApiError("");
    setModal("driver-form");
  }

  async function saveDriver(event) {
    event.preventDefault();
    setFormError("");

    const name = driverForm.driverName.trim();
    const license = driverForm.licenseNumber.trim().toUpperCase();
    const phone = driverForm.phoneNumber.trim();
    const address = driverForm.address.trim();
    const experienceText = String(driverForm.experienceYears).trim();

    if (!name || !license) {
      setFormError("Driver name and license number are required.");
      return;
    }

    if (name.length > 50 || license.length > 30) {
      setFormError("Name or license number exceeds the allowed length.");
      return;
    }

    if (phone.length > 15 || address.length > 100) {
      setFormError("Phone number or address is too long.");
      return;
    }

    const experience = experienceText === "" ? null : Number(experienceText);

    if (experience !== null &&
        (!Number.isInteger(experience) || experience < 0 || experience > 99)) {
      setFormError("Experience must be a whole number from 0 to 99.");
      return;
    }

    const duplicate = drivers.some(
      driver => driver.licenseNumber.toUpperCase() === license &&
        driver.id !== editingDriverId
    );

    if (duplicate) {
      setFormError("This license number is already registered.");
      return;
    }

    const driverData = {
      driverName: name,
      licenseNumber: license,
      phoneNumber: phone || null,
      address: address || null,
      experienceYears: experience
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

  async function deleteDriver(driver) {
    const confirmed = window.confirm(
      `CAUTION: Delete driver "${driver.driverName}"?\n\n` +
      "This action cannot be undone. If this driver has associated trips, " +
      "the deletion will be blocked to preserve trip history.\n\n" +
      "Do you want to continue?"
    );

    if (!confirmed) return;

    setApiError("");

    try {
      await apiRequest(`${API}/drivers/${driver.id}`, {
        method: "DELETE"
      });

      await loadDrivers();

      if (modal?.driver?.id === driver.id) setModal(null);
    } catch (error) {
      setApiError(error.message || "Could not delete driver.");
    }
  }

  const isVehiclePage = active === "Vehicles" || active === "Overview";

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <button className="brand" onClick={() => changePage("Overview")}>
          <span className="brand-mark"><Wrench size={21} /></span>
          <span className="brand-copy">
            <strong>Fleetari's</strong>
            <small>FLEET MANAGEMENT</small>
          </span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-link ${active === label ? "selected" : ""}`}
              onClick={() => changePage(label)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {active === label && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon"><Wrench size={17} /></span>
            <div>
              <strong>Fleetari's Garage</strong>
              <span>Fleet operations</span>
            </div>
          </div>
          <p className="sidebar-version">FLEETARI'S · ORACLE DATABASE</p>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            <span>Fleetari's</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{active}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment-label">ORACLE CONNECTED</span>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <h1>{active === "Overview" ? "Fleet overview" : active}</h1>
              <p>
                {active === "Overview"
                  ? "A clear view of your fleet and vehicle status."
                  : active === "Vehicles"
                    ? "Manage registrations, specifications and status."
                    : active === "Companies"
                      ? "Manage company details and their fleet associations."
                      : active === "Drivers"
                        ? "Manage driver details, licenses and experience."
                        : `Manage your fleet's ${active.toLowerCase()} records.`}
              </p>
            </div>

            {isVehiclePage && (
              <button
                className="primary-button"
                onClick={openAddVehicle}
                disabled={loading || companies.length === 0}
              >
                <Plus size={17} /> Add vehicle
              </button>
            )}

            {active === "Companies" && (
              <button
                className="primary-button"
                onClick={openAddCompany}
                disabled={loading}
              >
                <Plus size={17} /> Add company
              </button>
            )}

            {active === "Drivers" && (
              <button
                className="primary-button"
                onClick={openAddDriver}
                disabled={loading}
              >
                <Plus size={17} /> Add driver
              </button>
            )}
          </div>

          {apiError && (
            <div className="form-error" role="alert">
              {apiError}
              <button type="button" onClick={loadData} disabled={loading}>
                Retry
              </button>
            </div>
          )}

          {loading && <p>Loading records from Oracle...</p>}

          {isVehiclePage ? (
            <>
              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-label">Total vehicles</div>
                  <div className="stat-bottom">
                    <strong className="stat-number">{vehicles.length}</strong>
                    <span className="stat-caption">Registered</span>
                  </div>
                </article>
                <article className="stat-card">
                  <div className="stat-label">Active vehicles</div>
                  <div className="stat-bottom">
                    <strong className="stat-number">{activeCount}</strong>
                    <span className="stat-caption teal-text">In service</span>
                  </div>
                </article>
                <article className="stat-card">
                  <div className="stat-label">In maintenance</div>
                  <div className="stat-bottom">
                    <strong className="stat-number">{maintenanceCount}</strong>
                    <span className="stat-caption amber-text">Needs attention</span>
                  </div>
                </article>
                <article className="stat-card">
                  <div className="stat-label">Inactive vehicles</div>
                  <div className="stat-bottom">
                    <strong className="stat-number">{inactiveCount}</strong>
                    <span className="stat-caption">Out of service</span>
                  </div>
                </article>
              </section>

              {active === "Overview" && (
                <section className="overview-strip">
                  <div className="overview-strip-title">
                    <div>
                      <span className="section-kicker">FLEET STATUS</span>
                      <h2>Vehicle availability</h2>
                    </div>
                    <button className="text-button" onClick={() => changePage("Vehicles")}>
                      View all vehicles <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="availability-bar">
                    <span
                      className="availability-active"
                      style={{ width: `${vehicles.length ? activeCount / vehicles.length * 100 : 0}%` }}
                    />
                    <span
                      className="availability-maintenance"
                      style={{ width: `${vehicles.length ? maintenanceCount / vehicles.length * 100 : 0}%` }}
                    />
                    <span
                      className="availability-inactive"
                      style={{ width: `${vehicles.length ? inactiveCount / vehicles.length * 100 : 0}%` }}
                    />
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
                  <div>
                    <h2>{active === "Overview" ? "Recent vehicles" : "Vehicle records"}</h2>
                    <p>{filteredVehicles.length} {filteredVehicles.length === 1 ? "record" : "records"}</p>
                  </div>
                  <div className="table-controls">
                    <label className="search-field">
                      <Search size={16} />
                      <input
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Search vehicles"
                        aria-label="Search vehicles"
                      />
                      {search && (
                        <button type="button" className="clear-search"
                          onClick={() => setSearch("")} aria-label="Clear search">
                          <X size={14} />
                        </button>
                      )}
                    </label>
                    <label className="filter-field">
                      <select
                        value={statusFilter}
                        onChange={event => setStatusFilter(event.target.value)}
                        aria-label="Filter by status"
                      >
                        <option value="ALL">All statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                      <ChevronDown size={14} />
                    </label>
                  </div>
                </div>

                <div className="table-scroll">
                  <table className="vehicle-table">
                    <thead>
                      <tr>
                        <th>Registration</th>
                        <th>Vehicle</th>
                        <th>Capacity</th>
                        <th>Status</th>
                        <th className="actions-heading">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.length > 0 ? filteredVehicles.map(vehicle => {
                        const companyName = companies.find(
                          company => company.companyId === vehicle.companyId
                        )?.companyName;

                        return (
                          <tr key={vehicle.id}>
                            <td>
                              <span className="registration-number">{vehicle.number}</span>
                              <span className="registration-id">ID #{vehicle.id}</span>
                            </td>
                            <td>
                              <div className="vehicle-name">{vehicle.model}</div>
                              <div className="vehicle-type">
                                {vehicle.type}{companyName ? ` · ${companyName}` : ""}
                              </div>
                            </td>
                            <td>
                              <span className="capacity-value">{vehicle.capacity}</span>
                              <span className="capacity-unit">
                                {vehicle.type === "Bus" ? "seats" : "capacity"}
                              </span>
                            </td>
                            <td><StatusBadge status={vehicle.status} /></td>
                            <td>
                              <div className="row-actions">
                                <button type="button" aria-label={`View ${vehicle.number}`}
                                  title="View" onClick={() => setModal({ type: "view", vehicle })}>
                                  <Eye size={16} />
                                </button>
                                <button type="button" aria-label={`Edit ${vehicle.number}`}
                                  title="Edit" onClick={() => openEditVehicle(vehicle)}>
                                  <Pencil size={16} />
                                </button>
                                <button type="button" className="delete-action"
                                  aria-label={`Delete ${vehicle.number}`} title="Delete"
                                  onClick={() => deleteVehicle(vehicle.id)}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan="5">
                            <div className="empty-state">
                              <Search size={22} />
                              <strong>{loading ? "Loading vehicles..." : "No vehicles found"}</strong>
                              <span>{loading ? "Fetching records from Oracle." : "Try another search or change the status filter."}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="table-footer">
                  <span>Showing {filteredVehicles.length} of {vehicles.length} vehicles</span>
                  <span className="local-data-label">Saved in Oracle Database</span>
                </div>
              </section>
            </>
          ) : active === "Companies" ? (
            <section className="content-card">
              <div className="table-header">
                <div>
                  <h2>Company records</h2>
                  <p>{filteredCompanies.length} registered {filteredCompanies.length === 1 ? "company" : "companies"}</p>
                </div>
                <div className="table-controls">
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Search companies"
                      aria-label="Search companies"
                    />
                    {search && (
                      <button type="button" className="clear-search"
                        onClick={() => setSearch("")} aria-label="Clear search">
                        <X size={14} />
                      </button>
                    )}
                  </label>
                </div>
              </div>

              <div className="table-scroll">
                <table className="vehicle-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Contact number</th>
                      <th>Email</th>
                      <th>Address</th>
                      <th className="actions-heading">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.length > 0 ? filteredCompanies.map(company => (
                      <tr key={company.companyId}>
                        <td>
                          <span className="registration-number">{company.companyName}</span>
                          <span className="registration-id">ID #{company.companyId}</span>
                        </td>
                        <td>{company.contactNumber || "—"}</td>
                        <td>{company.email || "—"}</td>
                        <td>{company.address || "—"}</td>
                        <td>
                          <div className="row-actions">
                            <button type="button" title="View"
                              aria-label={`View ${company.companyName}`}
                              onClick={() => setModal({ type: "company-view", company })}>
                              <Eye size={16} />
                            </button>
                            <button type="button" title="Edit"
                              aria-label={`Edit ${company.companyName}`}
                              onClick={() => openEditCompany(company)}>
                              <Pencil size={16} />
                            </button>
                            <button type="button" className="delete-action" title="Delete"
                              aria-label={`Delete ${company.companyName}`}
                              onClick={() => deleteCompany(company)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5">
                          <div className="empty-state">
                            <Search size={22} />
                            <strong>{loading ? "Loading companies..." : "No companies found"}</strong>
                            <span>{loading ? "Fetching records from Oracle." : "Try another search or add a company."}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <span>Showing {filteredCompanies.length} of {companies.length} companies</span>
                <span className="local-data-label">Saved in Oracle Database</span>
              </div>
            </section>
          ) : active === "Drivers" ? (
            <section className="content-card">
              <div className="table-header">
                <div>
                  <h2>Driver records</h2>
                  <p>{filteredDrivers.length} registered {filteredDrivers.length === 1 ? "driver" : "drivers"}</p>
                </div>
                <div className="table-controls">
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Search drivers"
                      aria-label="Search drivers"
                    />
                    {search && (
                      <button type="button" className="clear-search"
                        onClick={() => setSearch("")} aria-label="Clear search">
                        <X size={14} />
                      </button>
                    )}
                  </label>
                </div>
              </div>

              <div className="table-scroll">
                <table className="vehicle-table">
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>License number</th>
                      <th>Phone number</th>
                      <th>Experience</th>
                      <th className="actions-heading">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.length > 0 ? filteredDrivers.map(driver => (
                      <tr key={driver.id}>
                        <td>
                          <span className="registration-number">{driver.driverName}</span>
                          <span className="registration-id">ID #{driver.id}</span>
                        </td>
                        <td>{driver.licenseNumber}</td>
                        <td>{driver.phoneNumber || "—"}</td>
                        <td>{driver.experienceYears === "" ? "—" : `${driver.experienceYears} years`}</td>
                        <td>
                          <div className="row-actions">
                            <button type="button" title="View"
                              aria-label={`View ${driver.driverName}`}
                              onClick={() => setModal({ type: "driver-view", driver })}>
                              <Eye size={16} />
                            </button>
                            <button type="button" title="Edit"
                              aria-label={`Edit ${driver.driverName}`}
                              onClick={() => openEditDriver(driver)}>
                              <Pencil size={16} />
                            </button>
                            <button type="button" className="delete-action" title="Delete"
                              aria-label={`Delete ${driver.driverName}`}
                              onClick={() => deleteDriver(driver)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5">
                          <div className="empty-state">
                            <Users size={22} />
                            <strong>{loading ? "Loading drivers..." : "No drivers found"}</strong>
                            <span>{loading ? "Fetching records from Oracle." : "Try another search or add a driver."}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <span>Showing {filteredDrivers.length} of {drivers.length} drivers</span>
                <span className="local-data-label">Saved in Oracle Database</span>
              </div>
            </section>
          ) : (
            <section className="module-placeholder">
              <div className="module-placeholder-icon">
                {(() => {
                  const ItemIcon = navigation.find(item => item.label === active)?.icon || Truck;
                  return <ItemIcon size={25} />;
                })()}
              </div>
              <h2>{active}</h2>
              <p>This section is ready for its records, forms and Oracle database integration.</p>
              <span className="module-tag">DATABASE INTEGRATION PENDING</span>
              <button className="secondary-button" onClick={() => changePage("Vehicles")}>
                <Truck size={16} /> Return to vehicles
              </button>
            </section>
          )}

          <footer className="page-footer">
            <span>Fleetari's <span className="footer-separator">/</span> Fleet Management</span>
            <span>Oracle Database</span>
          </footer>
        </div>
      </main>

      {modal === "vehicle-form" && (
        <div className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !savingVehicle) setModal(null);
          }}>
          <section className="modal-panel" role="dialog" aria-modal="true"
            aria-labelledby="vehicle-form-title">
            <div className="modal-header">
              <div>
                <span className="section-kicker">{editingId !== null ? "UPDATE RECORD" : "NEW RECORD"}</span>
                <h2 id="vehicle-form-title">{editingId !== null ? "Edit vehicle" : "Add vehicle"}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setModal(null)}
                aria-label="Close dialog" disabled={savingVehicle}>
                <X size={19} />
              </button>
            </div>
            <form onSubmit={saveVehicle}>
              <div className="form-grid">
                <label className="form-field form-field-wide">
                  <span>Company</span>
                  <select value={form.companyId}
                    onChange={event => setForm({ ...form, companyId: event.target.value })} required>
                    <option value="">Select company</option>
                    {companies.map(company => (
                      <option key={company.companyId} value={company.companyId}>{company.companyName}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field form-field-wide">
                  <span>Registration number</span>
                  <input value={form.number}
                    onChange={event => setForm({ ...form, number: event.target.value })}
                    placeholder="e.g. TN23AB1234" maxLength={20} required autoFocus />
                </label>
                <label className="form-field">
                  <span>Vehicle type</span>
                  <select value={form.type}
                    onChange={event => setForm({ ...form, type: event.target.value })}>
                    <option>Truck</option>
                    <option>Bus</option>
                    <option>Van</option>
                    <option>Car</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Capacity</span>
                  <input type="number" min="1" value={form.capacity}
                    onChange={event => setForm({ ...form, capacity: event.target.value })}
                    placeholder="e.g. 16" required />
                </label>
                <label className="form-field form-field-wide">
                  <span>Make and model</span>
                  <input value={form.model}
                    onChange={event => setForm({ ...form, model: event.target.value })}
                    placeholder="e.g. Tata Prima" maxLength={50} required />
                </label>
                <label className="form-field form-field-wide">
                  <span>Purchase date</span>
                  <input type="date" value={form.purchaseDate}
                    onChange={event => setForm({ ...form, purchaseDate: event.target.value })} />
                </label>
                <label className="form-field form-field-wide">
                  <span>Status</span>
                  <select value={form.status}
                    onChange={event => setForm({ ...form, status: event.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
              </div>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary-button"
                  onClick={() => setModal(null)} disabled={savingVehicle}>Cancel</button>
                <button type="submit" className="primary-button"
                  disabled={savingVehicle || loading}>
                  {savingVehicle ? "Saving..." : editingId !== null ? "Save changes" : "Add vehicle"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal === "company-form" && (
        <div className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !savingCompany) setModal(null);
          }}>
          <section className="modal-panel" role="dialog" aria-modal="true"
            aria-labelledby="company-form-title">
            <div className="modal-header">
              <div>
                <span className="section-kicker">{editingCompanyId !== null ? "UPDATE RECORD" : "NEW RECORD"}</span>
                <h2 id="company-form-title">{editingCompanyId !== null ? "Edit company" : "Add company"}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setModal(null)}
                aria-label="Close dialog" disabled={savingCompany}>
                <X size={19} />
              </button>
            </div>
            <form onSubmit={saveCompany}>
              <div className="form-grid">
                <label className="form-field form-field-wide">
                  <span>Company name</span>
                  <input value={companyForm.companyName}
                    onChange={event => setCompanyForm({ ...companyForm, companyName: event.target.value })}
                    placeholder="e.g. Vellore Transport Services" maxLength={100} required autoFocus />
                </label>
                <label className="form-field form-field-wide">
                  <span>Contact number</span>
                  <input type="tel" value={companyForm.contactNumber}
                    onChange={event => setCompanyForm({ ...companyForm, contactNumber: event.target.value })}
                    placeholder="e.g. 9876543210" maxLength={20} />
                </label>
                <label className="form-field form-field-wide">
                  <span>Email</span>
                  <input type="email" value={companyForm.email}
                    onChange={event => setCompanyForm({ ...companyForm, email: event.target.value })}
                    placeholder="e.g. contact@company.com" maxLength={100} />
                </label>
                <label className="form-field form-field-wide">
                  <span>Address</span>
                  <textarea rows={3} value={companyForm.address}
                    onChange={event => setCompanyForm({ ...companyForm, address: event.target.value })}
                    placeholder="Company address" maxLength={250} />
                </label>
              </div>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary-button"
                  onClick={() => setModal(null)} disabled={savingCompany}>Cancel</button>
                <button type="submit" className="primary-button" disabled={savingCompany}>
                  {savingCompany ? "Saving..." : editingCompanyId !== null ? "Save changes" : "Add company"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal === "driver-form" && (
        <div className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !savingDriver) setModal(null);
          }}>
          <section className="modal-panel" role="dialog" aria-modal="true"
            aria-labelledby="driver-form-title">
            <div className="modal-header">
              <div>
                <span className="section-kicker">{editingDriverId !== null ? "UPDATE RECORD" : "NEW RECORD"}</span>
                <h2 id="driver-form-title">{editingDriverId !== null ? "Edit driver" : "Add driver"}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setModal(null)}
                aria-label="Close dialog" disabled={savingDriver}>
                <X size={19} />
              </button>
            </div>
            <form onSubmit={saveDriver}>
              <div className="form-grid">
                <label className="form-field form-field-wide">
                  <span>Driver name *</span>
                  <input value={driverForm.driverName}
                    onChange={event => setDriverForm({ ...driverForm, driverName: event.target.value })}
                    maxLength={50} placeholder="Enter full name" required autoFocus />
                </label>
                <label className="form-field form-field-wide">
                  <span>License number *</span>
                  <input value={driverForm.licenseNumber}
                    onChange={event => setDriverForm({ ...driverForm, licenseNumber: event.target.value })}
                    maxLength={30} placeholder="Enter unique license number" required />
                </label>
                <label className="form-field form-field-wide">
                  <span>Phone number</span>
                  <input type="tel" value={driverForm.phoneNumber}
                    onChange={event => setDriverForm({ ...driverForm, phoneNumber: event.target.value })}
                    maxLength={15} placeholder="Enter phone number" />
                </label>
                <label className="form-field form-field-wide">
                  <span>Experience (years)</span>
                  <input type="number" min="0" max="99" step="1"
                    value={driverForm.experienceYears}
                    onChange={event => setDriverForm({ ...driverForm, experienceYears: event.target.value })}
                    placeholder="e.g. 5" />
                </label>
                <label className="form-field form-field-wide">
                  <span>Address</span>
                  <textarea rows={3} maxLength={100} value={driverForm.address}
                    onChange={event => setDriverForm({ ...driverForm, address: event.target.value })}
                    placeholder="Enter address" />
                </label>
              </div>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary-button"
                  onClick={() => setModal(null)} disabled={savingDriver}>Cancel</button>
                <button type="submit" className="primary-button" disabled={savingDriver}>
                  {savingDriver ? "Saving..." : editingDriverId !== null ? "Save changes" : "Add driver"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal?.type === "view" && (
        <div className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setModal(null);
          }}>
          <section className="modal-panel view-modal" role="dialog" aria-modal="true"
            aria-labelledby="vehicle-view-title">
            <div className="modal-header">
              <div>
                <span className="section-kicker">VEHICLE DETAILS</span>
                <h2 id="vehicle-view-title">{modal.vehicle.number}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setModal(null)}
                aria-label="Close dialog">
                <X size={19} />
              </button>
            </div>
            <div className="detail-list">
              <div><span>Registration ID</span><strong>#{modal.vehicle.id}</strong></div>
              <div>
                <span>Company</span>
                <strong>{companies.find(company => company.companyId === modal.vehicle.companyId)?.companyName || "—"}</strong>
              </div>
              <div><span>Vehicle type</span><strong>{modal.vehicle.type}</strong></div>
              <div><span>Make and model</span><strong>{modal.vehicle.model}</strong></div>
              <div>
                <span>Capacity</span>
                <strong>{modal.vehicle.capacity} {modal.vehicle.type === "Bus" ? "seats" : "capacity"}</strong>
              </div>
              <div><span>Purchase date</span><strong>{modal.vehicle.purchaseDate || "—"}</strong></div>
              <div><span>Status</span><StatusBadge status={modal.vehicle.status} /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>Close</button>
              <button type="button" className="primary-button"
                onClick={() => openEditVehicle(modal.vehicle)}>
                <Pencil size={15} /> Edit vehicle
              </button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "company-view" && (
        <div className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setModal(null);
          }}>
          <section className="modal-panel view-modal" role="dialog" aria-modal="true"
            aria-labelledby="company-view-title">
            <div className="modal-header">
              <div>
                <span className="section-kicker">COMPANY DETAILS</span>
                <h2 id="company-view-title">{modal.company.companyName}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setModal(null)}
                aria-label="Close dialog">
                <X size={19} />
              </button>
            </div>
            <div className="detail-list">
              <div><span>Company ID</span><strong>#{modal.company.companyId}</strong></div>
              <div><span>Company name</span><strong>{modal.company.companyName}</strong></div>
              <div><span>Contact number</span><strong>{modal.company.contactNumber || "—"}</strong></div>
              <div><span>Email</span><strong>{modal.company.email || "—"}</strong></div>
              <div><span>Address</span><strong>{modal.company.address || "—"}</strong></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>Close</button>
              <button type="button" className="primary-button"
                onClick={() => openEditCompany(modal.company)}>
                <Pencil size={15} /> Edit company
              </button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "driver-view" && (
        <div className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setModal(null);
          }}>
          <section className="modal-panel view-modal" role="dialog" aria-modal="true"
            aria-labelledby="driver-view-title">
            <div className="modal-header">
              <div>
                <span className="section-kicker">DRIVER DETAILS</span>
                <h2 id="driver-view-title">{modal.driver.driverName}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setModal(null)}
                aria-label="Close dialog">
                <X size={19} />
              </button>
            </div>
            <div className="detail-list">
              <div><span>Driver ID</span><strong>#{modal.driver.id}</strong></div>
              <div><span>Driver name</span><strong>{modal.driver.driverName}</strong></div>
              <div><span>License number</span><strong>{modal.driver.licenseNumber}</strong></div>
              <div><span>Phone number</span><strong>{modal.driver.phoneNumber || "—"}</strong></div>
              <div>
                <span>Experience</span>
                <strong>{modal.driver.experienceYears === "" ? "—" : `${modal.driver.experienceYears} years`}</strong>
              </div>
              <div><span>Address</span><strong>{modal.driver.address || "—"}</strong></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>Close</button>
              <button type="button" className="primary-button"
                onClick={() => openEditDriver(modal.driver)}>
                <Pencil size={15} /> Edit driver
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
