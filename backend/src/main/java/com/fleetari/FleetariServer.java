
package com.fleetari;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;

public class FleetariServer {
    static final Gson gson = new Gson();
    static final String url = "jdbc:oracle:thin:@localhost:1521:XE";

    static Connection connect() throws Exception {
        String user = System.getenv("FLEET_DB_USER");
        String pass = System.getenv("FLEET_DB_PASSWORD");

        if (user == null || pass == null) {
            throw new Exception("Set FLEET_DB_USER and FLEET_DB_PASSWORD.");
        }

        Class.forName("oracle.jdbc.OracleDriver");
        return DriverManager.getConnection(url, user, pass);
    }

    static String body(HttpExchange ex) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ex.getRequestBody().transferTo(out);
        return out.toString(StandardCharsets.UTF_8);
    }

    static void send(HttpExchange ex, int code, Object data) throws Exception {
        byte[] bytes = gson.toJson(data).getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "http://localhost:5173");
        ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
        ex.sendResponseHeaders(code, bytes.length);

        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }

    static Map<String, Object> error(String message) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("error", message);
        return result;
    }

    static Integer pathId(String path) {
        String[] parts = path.split("/");
        if (parts.length <= 3 || parts[3].isEmpty()) return null;

        try {
            return Integer.valueOf(parts[3]);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static String jsonString(JsonObject data, String key) {
        return data.has(key) && !data.get(key).isJsonNull()
                ? data.get(key).getAsString().trim() : null;
    }

    static void handle(HttpExchange ex) {
        try {
            if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
                ex.getResponseHeaders().set("Access-Control-Allow-Origin", "http://localhost:5173");
                ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
                ex.sendResponseHeaders(204, -1);
                ex.close();
                return;
            }

            String path = ex.getRequestURI().getPath();
            String method = ex.getRequestMethod();

            if (path.equals("/api/companies") || path.startsWith("/api/companies/")) {
                companies(ex, path, method);
                return;
            }

            if (path.equals("/api/vehicles") || path.startsWith("/api/vehicles/")) {
                vehicles(ex, path, method);
                return;
            }

            if (path.equals("/api/drivers") || path.startsWith("/api/drivers/")) {
                drivers(ex, path, method);
                return;
            }
            
            send(ex, 404, error("Endpoint not found"));
        } catch (Exception e) {
            try {
                send(ex, 500, error(e.getMessage() == null ? "Server error" : e.getMessage()));
            } catch (Exception ignored) {
            }
        }
    }

    static void companies(HttpExchange ex, String path, String method) throws Exception {
        Integer id = pathId(path);

        if ("GET".equals(method)) {
            List<Map<String, Object>> rows = new ArrayList<>();
            String sql = "SELECT COMPANY_ID, COMPANY_NAME, CONTACT_NUMBER, EMAIL, ADDRESS " +
                    "FROM FLEET_COMPANY" +
                    (id == null ? " ORDER BY COMPANY_ID" : " WHERE COMPANY_ID = ?");

            try (Connection c = connect();
                 PreparedStatement ps = c.prepareStatement(sql)) {
                if (id != null) ps.setInt(1, id);

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("companyId", rs.getInt("COMPANY_ID"));
                        row.put("companyName", rs.getString("COMPANY_NAME"));
                        row.put("contactNumber", rs.getString("CONTACT_NUMBER"));
                        row.put("email", rs.getString("EMAIL"));
                        row.put("address", rs.getString("ADDRESS"));
                        rows.add(row);
                    }
                }
            }

            if (id != null) {
                if (rows.isEmpty()) send(ex, 404, error("Company not found"));
                else send(ex, 200, rows.get(0));
            } else {
                send(ex, 200, rows);
            }
            return;
        }

        if ("POST".equals(method) || "PUT".equals(method)) {
            JsonObject data = gson.fromJson(body(ex), JsonObject.class);

            if (data == null) {
                send(ex, 400, error("Request body is required"));
                return;
            }

            String name = jsonString(data, "companyName");
            String contact = jsonString(data, "contactNumber");
            String email = jsonString(data, "email");
            String address = jsonString(data, "address");

            if (name == null || name.isEmpty()) {
                send(ex, 400, error("Company name is required"));
                return;
            }

            try (Connection c = connect()) {
                c.setAutoCommit(false);

                try {
                    if ("POST".equals(method)) {
                        int newId;

                        try (PreparedStatement ps = c.prepareStatement(
                                "SELECT NVL(MAX(COMPANY_ID), 0) + 1 FROM FLEET_COMPANY");
                             ResultSet rs = ps.executeQuery()) {
                            rs.next();
                            newId = rs.getInt(1);
                        }

                        String sql = "INSERT INTO FLEET_COMPANY " +
                                "(COMPANY_ID, COMPANY_NAME, CONTACT_NUMBER, EMAIL, ADDRESS) " +
                                "VALUES (?, ?, ?, ?, ?)";

                        try (PreparedStatement ps = c.prepareStatement(sql)) {
                            ps.setInt(1, newId);
                            ps.setString(2, name);
                            ps.setString(3, contact);
                            ps.setString(4, email);
                            ps.setString(5, address);
                            ps.executeUpdate();
                        }

                        c.commit();
                        send(ex, 201, Collections.singletonMap("companyId", newId));
                    } else {
                        if (id == null) {
                            c.rollback();
                            send(ex, 400, error("Valid company ID is required"));
                            return;
                        }

                        String sql = "UPDATE FLEET_COMPANY SET COMPANY_NAME = ?, CONTACT_NUMBER = ?, " +
                                "EMAIL = ?, ADDRESS = ? WHERE COMPANY_ID = ?";

                        try (PreparedStatement ps = c.prepareStatement(sql)) {
                            ps.setString(1, name);
                            ps.setString(2, contact);
                            ps.setString(3, email);
                            ps.setString(4, address);
                            ps.setInt(5, id);

                            int changed = ps.executeUpdate();

                            if (changed == 0) {
                                c.rollback();
                                send(ex, 404, error("Company not found"));
                                return;
                            }
                        }

                        c.commit();
                        send(ex, 200, Collections.singletonMap("message", "Company updated"));
                    }
                } catch (SQLException e) {
                    c.rollback();

                    if (e.getErrorCode() == 1) {
                        send(ex, 409, error("A company with one of these unique values already exists."));
                    } else {
                        throw e;
                    }
                } catch (Exception e) {
                    c.rollback();
                    throw e;
                }
            }
            return;
        }

        if ("DELETE".equals(method)) {
            if (id == null) {
                send(ex, 400, error("Valid company ID is required"));
                return;
            }

            try (Connection c = connect();
                 PreparedStatement ps = c.prepareStatement(
                         "DELETE FROM FLEET_COMPANY WHERE COMPANY_ID = ?")) {
                ps.setInt(1, id);
                int changed = ps.executeUpdate();

                if (changed == 0) {
                    send(ex, 404, error("Company not found"));
                } else {
                    send(ex, 200, Collections.singletonMap("message", "Company deleted"));
                }
            } catch (SQLException e) {
                if (e.getErrorCode() == 2292) {
                    send(ex, 409, error(
                            "This company cannot be deleted because vehicles or other records reference it."));
                } else {
                    throw e;
                }
            }
            return;
        }

        send(ex, 405, error("Method not allowed"));
    }

    static void vehicles(HttpExchange ex, String path, String method) throws Exception {
        Integer id = pathId(path);

        if ("GET".equals(method)) {
            List<Map<String, Object>> rows = new ArrayList<>();
            String sql = "SELECT VEHICLE_ID, COMPANY_ID, VEHICLE_NUMBER, VEHICLE_TYPE, MODEL, " +
                    "SEATING_CAPACITY, TO_CHAR(PURCHASE_DATE, 'YYYY-MM-DD') PURCHASE_DATE, STATUS " +
                    "FROM VEHICLE" +
                    (id == null ? " ORDER BY VEHICLE_ID" : " WHERE VEHICLE_ID = ?");

            try (Connection c = connect();
                 PreparedStatement ps = c.prepareStatement(sql)) {
                if (id != null) ps.setInt(1, id);

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("vehicleId", rs.getInt("VEHICLE_ID"));
                        row.put("companyId", rs.getInt("COMPANY_ID"));
                        row.put("vehicleNumber", rs.getString("VEHICLE_NUMBER"));
                        row.put("vehicleType", rs.getString("VEHICLE_TYPE"));
                        row.put("model", rs.getString("MODEL"));

                        Object capacityValue = rs.getObject("SEATING_CAPACITY");
                        row.put("seatingCapacity",
                                capacityValue == null ? null : ((Number) capacityValue).intValue());

                        row.put("purchaseDate", rs.getString("PURCHASE_DATE"));
                        row.put("status", rs.getString("STATUS"));
                        rows.add(row);
                    }
                }
            }

            if (id != null) {
                if (rows.isEmpty()) send(ex, 404, error("Vehicle not found"));
                else send(ex, 200, rows.get(0));
            } else {
                send(ex, 200, rows);
            }
            return;
        }

        if ("POST".equals(method) || "PUT".equals(method)) {
            JsonObject data = gson.fromJson(body(ex), JsonObject.class);

            if (data == null || !data.has("companyId") || data.get("companyId").isJsonNull()
                    || !data.has("vehicleNumber") || !data.has("vehicleType")) {
                send(ex, 400, error("Company, vehicle number and vehicle type are required"));
                return;
            }

            int companyId = data.get("companyId").getAsInt();
            String number = data.get("vehicleNumber").getAsString().trim();
            String type = data.get("vehicleType").getAsString().trim();
            String model = jsonString(data, "model");
            Integer capacity = data.has("seatingCapacity") && !data.get("seatingCapacity").isJsonNull()
                    ? data.get("seatingCapacity").getAsInt() : null;
            String date = jsonString(data, "purchaseDate");
            String status = jsonString(data, "status");

            if (number.isEmpty() || type.isEmpty()) {
                send(ex, 400, error("Vehicle number and type are required"));
                return;
            }

            try (Connection c = connect()) {
                c.setAutoCommit(false);

                try {
                    if ("POST".equals(method)) {
                        int newId;

                        try (PreparedStatement ps = c.prepareStatement(
                                "SELECT NVL(MAX(VEHICLE_ID), 0) + 1 FROM VEHICLE");
                             ResultSet rs = ps.executeQuery()) {
                            rs.next();
                            newId = rs.getInt(1);
                        }

                        String sql = "INSERT INTO VEHICLE (VEHICLE_ID, COMPANY_ID, VEHICLE_NUMBER, VEHICLE_TYPE, MODEL, " +
                                "SEATING_CAPACITY, PURCHASE_DATE, STATUS) " +
                                "VALUES (?, ?, ?, ?, ?, ?, TO_DATE(?, 'YYYY-MM-DD'), ?)";

                        try (PreparedStatement ps = c.prepareStatement(sql)) {
                            ps.setInt(1, newId);
                            ps.setInt(2, companyId);
                            ps.setString(3, number);
                            ps.setString(4, type);
                            ps.setString(5, model);

                            if (capacity == null) ps.setNull(6, Types.NUMERIC);
                            else ps.setInt(6, capacity);

                            if (date == null || date.isEmpty()) ps.setNull(7, Types.VARCHAR);
                            else ps.setString(7, date);

                            ps.setString(8, status);
                            ps.executeUpdate();
                        }

                        c.commit();
                        send(ex, 201, Collections.singletonMap("vehicleId", newId));
                    } else {
                        if (id == null) {
                            c.rollback();
                            send(ex, 400, error("Vehicle ID is required"));
                            return;
                        }

                        String sql = "UPDATE VEHICLE SET COMPANY_ID=?, VEHICLE_NUMBER=?, VEHICLE_TYPE=?, MODEL=?, " +
                                "SEATING_CAPACITY=?, PURCHASE_DATE=TO_DATE(?, 'YYYY-MM-DD'), STATUS=? WHERE VEHICLE_ID=?";

                        try (PreparedStatement ps = c.prepareStatement(sql)) {
                            ps.setInt(1, companyId);
                            ps.setString(2, number);
                            ps.setString(3, type);
                            ps.setString(4, model);

                            if (capacity == null) ps.setNull(5, Types.NUMERIC);
                            else ps.setInt(5, capacity);

                            if (date == null || date.isEmpty()) ps.setNull(6, Types.VARCHAR);
                            else ps.setString(6, date);

                            ps.setString(7, status);
                            ps.setInt(8, id);

                            int changed = ps.executeUpdate();

                            if (changed == 0) {
                                c.rollback();
                                send(ex, 404, error("Vehicle not found"));
                                return;
                            }
                        }

                        c.commit();
                        send(ex, 200, Collections.singletonMap("message", "Vehicle updated"));
                    }
                } catch (Exception e) {
                    c.rollback();
                    throw e;
                }
            }
            return;
        }

        if ("DELETE".equals(method)) {
            if (id == null) {
                send(ex, 400, error("Vehicle ID is required"));
                return;
            }

            try (Connection c = connect();
                 PreparedStatement ps = c.prepareStatement("DELETE FROM VEHICLE WHERE VEHICLE_ID = ?")) {
                ps.setInt(1, id);
                int changed = ps.executeUpdate();

                if (changed == 0) send(ex, 404, error("Vehicle not found"));
                else send(ex, 200, Collections.singletonMap("message", "Vehicle deleted"));
            } catch (SQLException e) {
                if (e.getErrorCode() == 2292) {
                    send(ex, 409, error(
                            "This vehicle cannot be deleted because other records reference it."));
                } else {
                    throw e;
                }
            }
            return;
        }

        send(ex, 405, error("Method not allowed"));
    }

    static void drivers(HttpExchange ex, String path, String method) throws Exception {
        Integer id = pathId(path);

        if ("GET".equals(method)) {
            List<Map<String, Object>> rows = new ArrayList<>();
            String sql = "SELECT DRIVER_ID, DRIVER_NAME, LICENSE_NUMBER, PHONE_NUMBER, ADDRESS, EXPERIENCE_YEARS " +
                    "FROM DRIVER" +
                    (id == null ? " ORDER BY DRIVER_ID" : " WHERE DRIVER_ID = ?");

            try (Connection c = connect();
                 PreparedStatement ps = c.prepareStatement(sql)) {
                if (id != null) ps.setInt(1, id);

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("driverId", rs.getInt("DRIVER_ID"));
                        row.put("driverName", rs.getString("DRIVER_NAME"));
                        row.put("licenseNumber", rs.getString("LICENSE_NUMBER"));
                        row.put("phoneNumber", rs.getString("PHONE_NUMBER"));
                        row.put("address", rs.getString("ADDRESS"));

                        Object experience = rs.getObject("EXPERIENCE_YEARS");
                        row.put("experienceYears",
                                experience == null ? null : ((Number) experience).intValue());

                        rows.add(row);
                    }
                }
            }

            if (id != null) {
                if (rows.isEmpty()) send(ex, 404, error("Driver not found"));
                else send(ex, 200, rows.get(0));
            } else {
                send(ex, 200, rows);
            }
            return;
        }

        if ("POST".equals(method) || "PUT".equals(method)) {
            JsonObject data = gson.fromJson(body(ex), JsonObject.class);

            if (data == null) {
                send(ex, 400, error("Request body is required"));
                return;
            }

            String name = jsonString(data, "driverName");
            String license = jsonString(data, "licenseNumber");
            String phone = jsonString(data, "phoneNumber");
            String address = jsonString(data, "address");
            Integer experience = null;

            try {
                if (data.has("experienceYears") && !data.get("experienceYears").isJsonNull()
                        && !data.get("experienceYears").getAsString().trim().isEmpty()) {
                    experience = data.get("experienceYears").getAsInt();
                }
            } catch (Exception e) {
                send(ex, 400, error("Experience must be a whole number"));
                return;
            }

            if (name == null || name.isEmpty() || license == null || license.isEmpty()) {
                send(ex, 400, error("Driver name and license number are required"));
                return;
            }

            if (name.length() > 50 || license.length() > 30
                    || (phone != null && phone.length() > 15)
                    || (address != null && address.length() > 100)) {
                send(ex, 400, error("One or more fields exceed the allowed length"));
                return;
            }

            if (experience != null && (experience < 0 || experience > 99)) {
                send(ex, 400, error("Experience must be between 0 and 99 years"));
                return;
            }

            try (Connection c = connect()) {
                c.setAutoCommit(false);

                try {
                    if ("POST".equals(method)) {
                        int newId;

                        try (PreparedStatement ps = c.prepareStatement(
                                "SELECT NVL(MAX(DRIVER_ID), 0) + 1 FROM DRIVER");
                             ResultSet rs = ps.executeQuery()) {
                            rs.next();
                            newId = rs.getInt(1);
                        }

                        String sql = "INSERT INTO DRIVER " +
                                "(DRIVER_ID, DRIVER_NAME, LICENSE_NUMBER, PHONE_NUMBER, ADDRESS, EXPERIENCE_YEARS) " +
                                "VALUES (?, ?, ?, ?, ?, ?)";

                        try (PreparedStatement ps = c.prepareStatement(sql)) {
                            ps.setInt(1, newId);
                            ps.setString(2, name);
                            ps.setString(3, license);
                            ps.setString(4, phone);
                            ps.setString(5, address);

                            if (experience == null) ps.setNull(6, Types.NUMERIC);
                            else ps.setInt(6, experience);

                            ps.executeUpdate();
                        }

                        c.commit();
                        send(ex, 201, Collections.singletonMap("driverId", newId));
                    } else {
                        if (id == null) {
                            c.rollback();
                            send(ex, 400, error("Valid driver ID is required"));
                            return;
                        }

                        String sql = "UPDATE DRIVER SET DRIVER_NAME=?, LICENSE_NUMBER=?, " +
                                "PHONE_NUMBER=?, ADDRESS=?, EXPERIENCE_YEARS=? WHERE DRIVER_ID=?";

                        try (PreparedStatement ps = c.prepareStatement(sql)) {
                            ps.setString(1, name);
                            ps.setString(2, license);
                            ps.setString(3, phone);
                            ps.setString(4, address);

                            if (experience == null) ps.setNull(5, Types.NUMERIC);
                            else ps.setInt(5, experience);

                            ps.setInt(6, id);

                            if (ps.executeUpdate() == 0) {
                                c.rollback();
                                send(ex, 404, error("Driver not found"));
                                return;
                            }
                        }

                        c.commit();
                        send(ex, 200, Collections.singletonMap("message", "Driver updated"));
                    }
                } catch (SQLException e) {
                    c.rollback();

                    if (e.getErrorCode() == 1) {
                        send(ex, 409, error("This license number is already registered."));
                    } else {
                        throw e;
                    }
                } catch (Exception e) {
                    c.rollback();
                    throw e;
                }
            }
            return;
        }

        if ("DELETE".equals(method)) {
            if (id == null) {
                send(ex, 400, error("Valid driver ID is required"));
                return;
            }

            try (Connection c = connect();
                 PreparedStatement ps = c.prepareStatement("DELETE FROM DRIVER WHERE DRIVER_ID = ?")) {
                ps.setInt(1, id);
                int changed = ps.executeUpdate();

                if (changed == 0) {
                    send(ex, 404, error("Driver not found"));
                } else {
                    send(ex, 200, Collections.singletonMap("message", "Driver deleted"));
                }
            } catch (SQLException e) {
                if (e.getErrorCode() == 2292) {
                    send(ex, 409, error(
                            "This driver cannot be deleted because trips are associated with this driver. " +
                            "Preserve the driver record to maintain trip history."));
                } else {
                    throw e;
                }
            }
            return;
        }

        send(ex, 405, error("Method not allowed"));
    }

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8081), 0);
        server.createContext("/api/", FleetariServer::handle);
        server.setExecutor(null);
        server.start();
        System.out.println("Fleetari API running at http://localhost:8081");
    }
}
