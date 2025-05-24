import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  Chip,
  CardContent,
  Box,
  Typography,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { db, auth } from "../manage-employee/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import AddIcon from "@mui/icons-material/Add";
import { useMaterialUIController } from "context";
import * as XLSX from "xlsx";
import { casual } from "chrono-node";

// Define constants for statuses and industries
const statuses = ["Active", "Inactive"];
const industries = ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"];

// Utility function to format Firestore timestamps
const formatTimestamp = (timestamp) => {
  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleDateString();
  }
  return timestamp || "N/A";
};

// Utility function to generate random numbers for IDs
const generateRandomNumber = () => Math.floor(100 + Math.random() * 900);

// Generate unique client ID
const generateClientId = () => `CL-${generateRandomNumber()}`;

// Generate unique contract ID
const generateContractId = () => `CON-${generateRandomNumber()}`;

// Check if an ID is unique in Firestore
const checkUniqueId = async (collectionName, field, value, excludeDocId = null) => {
  try {
    const q = query(collection(db, collectionName), where(field, "==", value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.every((doc) => doc.id !== excludeDocId);
  } catch (error) {
    console.error(`Error checking unique ${field}:`, error);
    return false;
  }
};

// Clean numeric values for consistency
const cleanNumericValue = (value) => {
  if (typeof value === "string") {
    return parseFloat(value.replace(/[^0-9.-]+/g, "")) || 0;
  }
  return parseFloat(value) || 0;
};

// Validate date strings
const validateDate = (dateStr) => {
  const parsed = casual.parseDate(dateStr);
  return parsed ? dateStr : null;
};

// Main component for client management
const ManageClient = () => {
  // State declarations for form fields and UI
  const [open, setOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [editingClient, setEditingClient] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [cac, setCac] = useState("");
  const [cltv, setCltv] = useState("");
  const [revenueGenerated, setRevenueGenerated] = useState("");
  const [oneTimeRevenue, setOneTimeRevenue] = useState("");
  const [recurringRevenue, setRecurringRevenue] = useState("");
  const [status, setStatus] = useState("");
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [excelOption, setExcelOption] = useState("");

  // Fetch user roles from Firestore
  useEffect(() => {
    const fetchUserRoles = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const q = query(collection(db, "users"), where("email", "==", user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            setUserRoles(userDoc.roles || []);
          } else {
            console.error("User not found in Firestore");
            setUserRoles([]);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setUserRoles([]);
        }
      } else {
        setUserRoles([]);
      }
      setLoadingRoles(false);
    };

    fetchUserRoles();
  }, []);

  // Determine user permissions
  const isReadOnly =
    userRoles.includes("ManageClient:read") && !userRoles.includes("ManageClient:full access");
  const hasAccess =
    userRoles.includes("ManageClient:read") || userRoles.includes("ManageClient:full access");

  // Fetch clients and projects from Firestore
  const fetchAllData = useCallback(async () => {
    try {
      setLoadingProjects(true);
      setFetchError(null);
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        setFetchError("No authenticated user. Please log in.");
        return;
      }

      let clientsQuery = collection(db, "clients");
      if (isReadOnly) {
        clientsQuery = query(clientsQuery, where("email", "==", user.email));
      }
      clientsQuery = query(clientsQuery, where("status", "in", ["Active", "Inactive"]));

      const projectsQuery = query(
        collection(db, "projects"),
        where("status", "in", ["Active", "Ongoing"])
      );

      const [clientsSnapshot, projectsSnapshot] = await Promise.all([
        getDocs(clientsQuery),
        getDocs(projectsQuery),
      ]);

      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        projectId: doc.data().projectId || "Unknown",
        ...doc.data(),
      }));

      console.log("Fetched projects:", projectsData);
      setClients(clientsData);
      setProjects(projectsData);
      if (projectsData.length === 0) {
        console.warn("No active or ongoing projects found in Firestore");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setFetchError("Failed to fetch data. Please try again.");
    } finally {
      setLoadingProjects(false);
    }
  }, [isReadOnly]);

  // Trigger data fetch when roles are loaded
  useEffect(() => {
    if (!loadingRoles) {
      fetchAllData();
    }
  }, [loadingRoles, fetchAllData]);

  // Handle Excel option change
  const handleExcelOptionChange = (event) => {
    const option = event.target.value;
    setExcelOption(option);

    if (option === "upload") {
      document.getElementById("file-upload").click();
    } else if (option === "download") {
      handleDownloadExcel();
    } else if (option === "downloadDummy") {
      handleDownloadDummyExcel();
    }

    // Reset the select value after action
    setExcelOption("");
  };

  // Handle Excel file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", blankrows: false });

        const validProjectIds = projects.map((p) => p.projectId);

        // Normalize column names for Excel import
        const normalizeColumnName = (name) => {
          if (!name) return "";
          const cleanName = name.trim().toLowerCase().replace(/\s+/g, "");
          if (cleanName.includes("name") || cleanName.includes("clientname")) return "Name";
          if (cleanName.includes("email")) return "Email";
          if (cleanName.includes("phone")) return "Phone";
          if (cleanName.includes("address")) return "Address";
          if (cleanName.includes("industry")) return "Industry";
          if (cleanName.includes("contractstart") || cleanName.includes("startdate"))
            return "Contract Start Date";
          if (cleanName.includes("contractend") || cleanName.includes("enddate"))
            return "Contract End Date";
          if (cleanName.includes("contractamount") || cleanName.includes("amount"))
            return "Contract Amount";
          if (cleanName.includes("cac")) return "CAC";
          if (cleanName.includes("cltv")) return "CLTV";
          if (cleanName.includes("revenuegenerated") || cleanName.includes("totalrevenue"))
            return "Revenue Generated";
          if (cleanName.includes("onetime") || cleanName.includes("onetime"))
            return "One-Time Revenue";
          if (cleanName.includes("recurringrevenue")) return "Recurring Revenue";
          if (cleanName.includes("status")) return "Status";
          if (cleanName.includes("projectid") || cleanName.includes("projects"))
            return "Project IDs";
          return name;
        };

        const normalizedData = jsonData.map((row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeColumnName(key)] = row[key];
          });
          return normalizedRow;
        });

        for (const client of normalizedData) {
          let newClientId = generateClientId();
          let newContractId = generateContractId();
          let attempts = 0;
          const maxAttempts = 10;

          // Ensure unique client ID
          while (attempts < maxAttempts) {
            const isClientIdUnique = await checkUniqueId("clients", "clientId", newClientId);
            if (isClientIdUnique) break;
            newClientId = generateClientId();
            attempts++;
          }

          // Ensure unique contract ID
          attempts = 0;
          while (attempts < maxAttempts) {
            const isContractIdUnique = await checkUniqueId("clients", "contractId", newContractId);
            if (isContractIdUnique) break;
            newContractId = generateContractId();
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error("Could not generate unique IDs for client:", client["Name"]);
            alert("Failed to generate unique IDs for some clients. Please try again.");
            return;
          }

          // Validate required fields
          if (
            !client["Name"]?.trim() ||
            !client["Email"]?.trim() ||
            !client["Industry"]?.trim() ||
            !client["Contract Start Date"] ||
            !client["Contract End Date"] ||
            !client["Contract Amount"] ||
            !client["Status"]?.trim()
          ) {
            console.error("Missing required fields in client:", client["Name"]);
            alert(
              `Missing required fields for client ${
                client["Name"] || "unknown"
              }. Required: Name, Email, Industry, Contract Start Date, Contract End Date, Contract Amount, Status.`
            );
            return;
          }

          // Validate industry
          const normalizedIndustry = client["Industry"].trim();
          if (!industries.map((i) => i.toLowerCase()).includes(normalizedIndustry.toLowerCase())) {
            console.error("Invalid industry for client:", client["Name"]);
            alert(`Invalid industry "${client["Industry"]}" for client ${client["Name"]}.`);
            return;
          }

          // Validate status
          const normalizedStatus = client["Status"].trim();
          if (!statuses.map((s) => s.toLowerCase()).includes(normalizedStatus.toLowerCase())) {
            console.error("Invalid status for client:", client["Name"]);
            alert(`Invalid status "${client["Status"]}" for client ${client["Name"]}.`);
            return;
          }

          // Process dates
          let startDate = client["Contract Start Date"];
          let endDate = client["Contract End Date"];

          if (startDate instanceof Date) {
            startDate = startDate.toISOString().substring(0, 10);
          } else {
            startDate = validateDate(client["Contract Start Date"]?.toString());
          }
          if (endDate instanceof Date) {
            endDate = endDate.toISOString().substring(0, 10);
          } else {
            endDate = validateDate(client["Contract End Date"]?.toString());
          }

          if (!startDate) {
            console.error("Invalid contract start date for client:", client["Name"]);
            alert(
              `Invalid contract start date "${client["Contract Start Date"]}" for client ${client["Name"]}.`
            );
            return;
          }
          if (!endDate) {
            console.error("Invalid contract end date for client:", client["Name"]);
            alert(
              `Invalid contract end date "${client["Contract End Date"]}" for client ${client["Name"]}.`
            );
            return;
          }

          // Validate contract amount
          const contractAmount = cleanNumericValue(client["Contract Amount"]);
          if (contractAmount <= 0) {
            console.error("Invalid contract amount for client:", client["Name"]);
            alert(`Contract amount must be positive for client ${client["Name"]}.`);
            return;
          }

          // Validate CAC
          const cac = cleanNumericValue(client["CAC"] || 0);
          if (cac < 0) {
            console.error("Invalid CAC for client:", client["Name"]);
            alert(`CAC cannot be negative for client ${client["Name"]}.`);
            return;
          }

          // Validate CLTV
          const cltv = cleanNumericValue(client["CLTV"] || 0);
          if (cltv < 0) {
            console.error("Invalid CLTV for client:", client["Name"]);
            alert(`CLTV cannot be negative for client ${client["Name"]}.`);
            return;
          }

          // Validate revenue generated
          const revenueGenerated = cleanNumericValue(client["Revenue Generated"] || 0);
          if (revenueGenerated < 0) {
            console.error("Invalid revenue generated for client:", client["Name"]);
            alert(`Revenue generated cannot be negative for client ${client["Name"]}.`);
            return;
          }

          // Validate one-time revenue
          const oneTimeRevenue = cleanNumericValue(client["One-Time Revenue"] || 0);
          if (oneTimeRevenue < 0) {
            console.error("Invalid one-time revenue for client:", client["Name"]);
            alert(`One-time revenue cannot be negative for client ${client["Name"]}.`);
            return;
          }

          // Validate recurring revenue
          const recurringRevenue = cleanNumericValue(client["Recurring Revenue"] || 0);
          if (recurringRevenue < 0) {
            console.error("Invalid recurring revenue for client:", client["Name"]);
            alert(`Recurring revenue cannot be negative for client ${client["Name"]}.`);
            return;
          }

          // Process project IDs
          let projectIds = [];
          if (client["Project IDs"]) {
            projectIds = client["Project IDs"]
              .toString()
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id);
            projectIds = projectIds.filter((id) => validProjectIds.includes(id));
          }

          // Create new client object
          const newClient = {
            clientId: newClientId,
            contractId: newContractId,
            name: client["Name"].trim(),
            email: client["Email"].trim(),
            phone: client["Phone"]?.toString().trim() || "",
            address: client["Address"]?.toString().trim() || "",
            industry: normalizedIndustry,
            contractStartDate: startDate,
            contractEndDate: endDate,
            contractAmount: contractAmount,
            Metrics: {
              cac: cac,
              cltv: cltv,
              revenueGenerated: revenueGenerated,
              revenueBreakdown: {
                oneTimeRevenue: oneTimeRevenue,
                recurringRevenue: recurringRevenue,
              },
            },
            status: normalizedStatus,
            projects: projectIds,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Save client to Firestore
          try {
            const docRef = await addDoc(collection(db, "clients"), newClient);
            setClients((prev) => [...prev, { id: docRef.id, ...newClient }]);
          } catch (error) {
            console.error("Error adding client from Excel:", error);
            alert(`Failed to add client ${client["Name"] || "unknown"}. Error: ${error.message}`);
            return;
          }
        }
        alert("Clients imported successfully!");
        fetchAllData();
      } catch (error) {
        console.error("Error processing Excel file:", error);
        alert(
          "Failed to process Excel file. Please ensure it contains the required fields (Name, Email, Industry, Contract Start Date, Contract End Date, Contract Amount, Status) and is in a valid format (.xlsx, .xls, .csv)."
        );
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle Excel download
  const handleDownloadExcel = () => {
    const exportData = clients.map((client) => ({
      Name: client.name,
      Email: client.email,
      Phone: client.phone || "N/A",
      Address: client.address || "N/A",
      Industry: client.industry,
      "Contract Start Date": formatTimestamp(client.contractStartDate),
      "Contract End Date": formatTimestamp(client.contractEndDate),
      "Contract Amount": client.contractAmount,
      CAC: client.Metrics?.cac || 0,
      CLTV: client.Metrics?.cltv || 0,
      "Revenue Generated": client.Metrics?.revenueGenerated || 0,
      "One-Time Revenue": client.Metrics?.revenueBreakdown?.oneTimeRevenue || 0,
      "Recurring Revenue": client.Metrics?.revenueBreakdown?.recurringRevenue || 0,
      Status: client.status,
      "Project IDs": Array.isArray(client.projects)
        ? client.projects.join(", ")
        : client.projects || "",
      "Created At": formatTimestamp(client.createdAt),
      "Updated At": formatTimestamp(client.updatedAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, "clients_export.xlsx");
  };

  // Handle dummy Excel download
  const handleDownloadDummyExcel = () => {
    const dummyData = [
      {
        Name: "",
        Email: "",
        Phone: "",
        Address: "",
        Industry: "",
        "Contract Start Date": "",
        "Contract End Date": "",
        "Contract Amount": "",
        CAC: "",
        CLTV: "",
        "Revenue Generated": "",
        "One-Time Revenue": "",
        "Recurring Revenue": "",
        Status: "",
        "Project IDs": "",
        "Created At": "",
        "Updated At": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dummyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, "clients_dummy.xlsx");
  };

  // Open dialog for adding/editing client
  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  // Close dialog
  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  // Populate form for editing client
  const handleEdit = (client) => {
    setEditingClient(client);
    setName(client.name || "");
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setAddress(client.address || "");
    setIndustry(client.industry || "");
    setContractStartDate(
      client.contractStartDate && typeof client.contractStartDate.toDate === "function"
        ? client.contractStartDate.toDate().toISOString().substring(0, 10)
        : client.contractStartDate || ""
    );
    setContractEndDate(
      client.contractEndDate && typeof client.contractEndDate.toDate === "function"
        ? client.contractEndDate.toDate().toISOString().substring(0, 10)
        : client.contractEndDate || ""
    );
    setContractAmount(client.contractAmount || "");
    setCac(client.Metrics?.cac || "");
    setCltv(client.Metrics?.cltv || "");
    setRevenueGenerated(client.Metrics?.revenueGenerated || "");
    setOneTimeRevenue(client.Metrics?.revenueBreakdown?.oneTimeRevenue || "");
    setRecurringRevenue(client.Metrics?.revenueBreakdown?.recurringRevenue || "");
    setStatus(client.status || "");
    setSelectedProjects(Array.isArray(client.projects) ? client.projects : []);
    setErrors({});
    setOpen(true);
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!industry) newErrors.industry = "Industry is required";
    if (!contractStartDate) newErrors.contractStartDate = "Contract Start Date is required";
    if (!contractEndDate) newErrors.contractEndDate = "Contract End Date is required";
    if (!contractAmount) newErrors.contractAmount = "Contract Amount is required";
    else if (parseFloat(contractAmount) <= 0)
      newErrors.contractAmount = "Contract Amount must be positive";
    if (!status) newErrors.status = "Status is required";
    if (cac && parseFloat(cac) < 0) newErrors.cac = "CAC cannot be negative";
    if (cltv && parseFloat(cltv) < 0) newErrors.cltv = "CLTV cannot be negative";
    if (revenueGenerated && parseFloat(revenueGenerated) < 0)
      newErrors.revenueGenerated = "Revenue Generated cannot be negative";
    if (oneTimeRevenue && parseFloat(oneTimeRevenue) < 0)
      newErrors.oneTimeRevenue = "One-Time Revenue cannot be negative";
    if (recurringRevenue && parseFloat(recurringRevenue) < 0)
      newErrors.recurringRevenue = "Recurring Revenue cannot be negative";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      setConfirmUpdateOpen(true);
    }
  };

  // Confirm and save client updates
  const confirmUpdate = async () => {
    let newClientId = editingClient ? editingClient.clientId : generateClientId();
    let newContractId = editingClient ? editingClient.contractId : generateContractId();
    let attempts = 0;
    const maxAttempts = 10;

    if (!editingClient) {
      while (attempts < maxAttempts) {
        const isClientIdUnique = await checkUniqueId("clients", "clientId", newClientId);
        if (isClientIdUnique) break;
        newClientId = generateClientId();
        attempts++;
      }

      attempts = 0;
      while (attempts < maxAttempts) {
        const isContractIdUnique = await checkUniqueId("clients", "contractId", newContractId);
        if (isContractIdUnique) break;
        newContractId = generateContractId();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error("Could not generate unique IDs");
        alert("Failed to generate unique Client ID or Contract ID. Please try again.");
        setConfirmUpdateOpen(false);
        return;
      }
    }

    // Create new client object
    const newClient = {
      clientId: newClientId,
      contractId: newContractId,
      name,
      email,
      phone,
      address,
      industry,
      contractStartDate,
      contractEndDate,
      contractAmount: parseFloat(contractAmount) || 0,
      Metrics: {
        cac: parseFloat(cac) || 0,
        cltv: parseFloat(cltv) || 0,
        revenueGenerated: parseFloat(revenueGenerated) || 0,
        revenueBreakdown: {
          oneTimeRevenue: parseFloat(oneTimeRevenue) || 0,
          recurringRevenue: parseFloat(recurringRevenue) || 0,
        },
      },
      status,
      projects: selectedProjects,
      createdAt: editingClient ? editingClient.createdAt : new Date(),
      updatedAt: new Date(),
    };

    // Save to Firestore
    try {
      if (editingClient) {
        await updateDoc(doc(db, "clients", editingClient.id), newClient);
        setClients(
          clients.map((client) =>
            client.id === editingClient.id ? { ...client, ...newClient } : client
          )
        );
      } else {
        const docRef = await addDoc(collection(db, "clients"), newClient);
        setClients([...clients, { id: docRef.id, ...newClient }]);
      }
      setConfirmUpdateOpen(false);
      handleClose();
      fetchAllData();
    } catch (error) {
      console.error("Error saving client:", error);
      alert("Failed to save client. Please try again.");
    }
  };

  // Reset form fields
  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setIndustry("");
    setContractStartDate("");
    setContractEndDate("");
    setContractAmount("");
    setCac("");
    setCltv("");
    setRevenueGenerated("");
    setOneTimeRevenue("");
    setRecurringRevenue("");
    setStatus("");
    setSelectedProjects([]);
    setEditingClient(null);
    setErrors({});
  };

  // Styles for form elements
  const formContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
    padding: "10px 20px",
    width: "500px",
    textAlign: "center",
    margin: "auto",
  };

  const formStyle = {
    border: "none",
  };

  const labelStyle = {
    fontSize: "15px",
    display: "block",
    width: "100%",
    marginTop: "8px",
    marginBottom: "5px",
    textAlign: "left",
    color: "#555",
    fontWeight: "bold",
  };

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "3px",
    fontSize: "12px",
  };

  const selectStyle = {
    display: "block",
    width: "100%",
    marginBottom: "15px",
    padding: "10px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "12px",
  };

  const checkboxContainerStyle = {
    display: "block",
    width: "100%",
    maxHeight: "150px",
    overflowY: "auto",
    marginBottom: "15px",
    padding: "10px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "12px",
    backgroundColor: "#fff",
  };

  const buttonStyle = {
    padding: "15px",
    borderRadius: "10px",
    margin: "15px",
    border: "none",
    color: "white",
    cursor: "pointer",
    backgroundColor: "#4caf50",
    width: "40%",
    fontSize: "16px",
    fontWeight: "bold",
  };

  const titleStyle = {
    fontSize: "x-large",
    textAlign: "center",
    color: "#327c35",
  };

  // Handle project selection change
  const handleProjectChange = (projectId) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  // Render loading state
  if (loadingRoles) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          Loading...
        </MDTypography>
      </Box>
    );
  }

  // Render access denied
  if (!hasAccess) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          You do not have permission to view this page.
        </MDTypography>
      </Box>
    );
  }

  // Render fetch error
  if (fetchError) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <MDTypography variant="h6" color="error">
          {fetchError}
        </MDTypography>
      </Box>
    );
  }

  // Main render
  return (
    <Box
      sx={{
        backgroundColor: darkMode ? "background.default" : "background.paper",
        minHeight: "100vh",
      }}
    >
      <DashboardNavbar
        absolute
        light={!darkMode}
        isMini={false}
        sx={{
          backgroundColor: darkMode ? "rgba(33, 33, 33, 0.9)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          width: { xs: "100%", md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 260px)" },
        }}
      />
      <MDBox
        p={3}
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          marginTop: { xs: "140px", md: "100px" },
          backgroundColor: darkMode ? "background.default" : "background.paper",
          minHeight: "calc(100vh - 80px)",
          paddingTop: { xs: "32px", md: "24px" },
          zIndex: 1000,
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor={darkMode ? "dark" : "info"}
                borderRadius="lg"
                coloredShadow={darkMode ? "dark" : "info"}
              >
                <MDTypography variant="h6" color={darkMode ? "white" : "black"}>
                  Client Management
                </MDTypography>
              </MDBox>
              <MDBox pt={2} pb={2} px={2}>
                {!isReadOnly && (
                  <Box sx={{ display: "flex", gap: 2, mb: 1, alignItems: "center" }}>
                    <Button
                      variant="gradient"
                      color={darkMode ? "dark" : "info"}
                      onClick={handleClickOpen}
                      startIcon={<AddIcon />}
                      sx={{
                        textTransform: "none",
                        fontWeight: "medium",
                        boxShadow: 3,
                        "&:hover": {
                          boxShadow: 6,
                          backgroundColor: darkMode ? "grey.700" : "info.dark",
                        },
                      }}
                    >
                      Add Client
                    </Button>
                    <FormControl sx={{ minWidth: 150 }}>
                      <InputLabel id="excel-options-label">Excel Options</InputLabel>
                      <Select
                        labelId="excel-options-label"
                        value={excelOption}
                        onChange={handleExcelOptionChange}
                        label="Excel Options"
                        sx={{
                          height: "36px",
                          "& .MuiSelect-select": {
                            padding: "8px",
                          },
                        }}
                      >
                        <MenuItem value="" disabled>
                          Select an option
                        </MenuItem>
                        <MenuItem value="upload">Upload Excel</MenuItem>
                        <MenuItem value="download">Download Excel</MenuItem>
                        <MenuItem value="downloadDummy">Download Dummy Excel</MenuItem>
                      </Select>
                    </FormControl>
                    <input
                      id="file-upload"
                      type="file"
                      hidden
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                    />
                  </Box>
                )}
              </MDBox>
              <Grid container spacing={2} sx={{ padding: "12px" }}>
                {clients.map((client) => (
                  <Grid item xs={12} key={client.id}>
                    <Card
                      sx={{
                        background: darkMode
                          ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                          : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                        padding: "16px",
                        transition: "0.3s ease-in-out",
                        "&:hover": {
                          boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                          transform: "scale(1.02)",
                        },
                      }}
                    >
                      <CardContent sx={{ padding: 0, "&:last-child": { paddingBottom: 0 } }}>
                        <MDBox>
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: "bold",
                              color: darkMode ? "#fff" : "#333",
                              mb: 2,
                            }}
                          >
                            {client.name}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                              >
                                <span>Client ID: </span>
                                <span style={{ fontWeight: "bold" }}>{client.clientId}</span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                display="block"
                              >
                                <span>Email: </span>
                                <span style={{ fontWeight: "bold" }}>{client.email || "N/A"}</span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                display="block"
                              >
                                <span>Phone: </span>
                                <span style={{ fontWeight: "bold" }}>{client.phone || "N/A"}</span>
                              </MDTypography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                              >
                                <span>Contract ID: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.contractId || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                display="block"
                              >
                                <span>Start: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {formatTimestamp(client.contractStartDate)}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                display="block"
                              >
                                <span>End: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {formatTimestamp(client.contractEndDate)}
                                </span>
                              </MDTypography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                              >
                                <span>Amount: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  ${client.contractAmount || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                display="block"
                              >
                                <span>Status: </span>
                                <Chip
                                  label={client.status}
                                  size="small"
                                  sx={{
                                    backgroundColor:
                                      client.status === "Active" ? "#4CAF50" : "#F44336",
                                    color: "#fff",
                                    fontSize: "12px",
                                    height: "24px",
                                  }}
                                />
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                display="block"
                              >
                                <span>Industry: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.industry || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                display="block"
                              >
                                <span>Project IDs: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {Array.isArray(client.projects) && client.projects.length > 0
                                    ? client.projects.join(", ")
                                    : "N/A"}
                                </span>
                              </MDTypography>
                            </Grid>
                            <Grid item xs={12}>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                mt={1}
                              >
                                <span>Metrics: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  CAC: ${client.Metrics?.cac || "N/A"} | CLTV: $
                                  {client.Metrics?.cltv || "N/A"} | Revenue: $
                                  {client.Metrics?.revenueGenerated || "N/A"}
                                </span>
                              </MDTypography>
                            </Grid>
                          </Grid>
                          {!isReadOnly && (
                            <MDBox mt={2} display="flex" justifyContent="flex-end">
                              <MDButton
                                variant="gradient"
                                color={darkMode ? "dark" : "info"}
                                onClick={() => handleEdit(client)}
                                size="small"
                              >
                                Edit
                              </MDButton>
                            </MDBox>
                          )}
                        </MDBox>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Box
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          backgroundColor: darkMode ? "background.default" : "background.paper",
          zIndex: 1100,
        }}
      >
        <Footer />
      </Box>
      {!isReadOnly && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: "#f3f3f3",
              borderRadius: "15px",
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
              width: "500px",
              margin: "auto",
            },
          }}
        >
          <DialogTitle sx={{ ...titleStyle }}>
            {editingClient ? "Edit Client" : "Add Client"}
          </DialogTitle>
          <DialogContent sx={{ py: 2, padding: "10px 20px" }}>
            <fieldset style={formStyle}>
              <form action="#" method="get">
                <label style={labelStyle} htmlFor="name">
                  Name
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.name ? "red" : "#ddd" }}
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter Name"
                  required
                />
                {errors.name && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.name}</span>
                )}

                <label style={labelStyle} htmlFor="email">
                  Email
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.email ? "red" : "#ddd" }}
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Email"
                  required
                />
                {errors.email && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.email}</span>
                )}

                <label style={labelStyle} htmlFor="phone">
                  Phone
                </label>
                <input
                  style={inputStyle}
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter Phone Number"
                />

                <label style={labelStyle} htmlFor="address">
                  Address
                </label>
                <input
                  style={inputStyle}
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter Address"
                />

                <label style={labelStyle} htmlFor="industry">
                  Industry*
                </label>
                <select
                  style={{ ...selectStyle, borderColor: errors.industry ? "red" : "#ddd" }}
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select Industry
                  </option>
                  {industries.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.industry && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.industry}</span>
                )}

                <label style={labelStyle} htmlFor="contractStartDate">
                  Contract Start Date*
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.contractStartDate ? "red" : "#ddd" }}
                  type="date"
                  id="contractStartDate"
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                  required
                />
                {errors.contractStartDate && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.contractStartDate}</span>
                )}

                <label style={labelStyle} htmlFor="contractEndDate">
                  Contract End Date*
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.contractEndDate ? "red" : "#ddd" }}
                  type="date"
                  id="contractEndDate"
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  required
                />
                {errors.contractEndDate && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.contractEndDate}</span>
                )}

                <label style={labelStyle} htmlFor="contractAmount">
                  Contract Amount*
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.contractAmount ? "red" : "#ddd" }}
                  type="number"
                  id="contractAmount"
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  placeholder="Enter Contract Amount"
                  required
                />
                {errors.contractAmount && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.contractAmount}</span>
                )}

                <label style={labelStyle} htmlFor="cac">
                  CAC
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.cac ? "red" : "#ddd" }}
                  type="number"
                  id="cac"
                  value={cac}
                  onChange={(e) => setCac(e.target.value)}
                  placeholder="Enter CAC"
                />
                {errors.cac && <span style={{ color: "red", fontSize: "12px" }}>{errors.cac}</span>}

                <label style={labelStyle} htmlFor="cltv">
                  CLTV
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.cltv ? "red" : "#ddd" }}
                  type="number"
                  id="cltv"
                  value={cltv}
                  onChange={(e) => setCltv(e.target.value)}
                  placeholder="Enter CLTV"
                />
                {errors.cltv && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.cltv}</span>
                )}

                <label style={labelStyle} htmlFor="revenueGenerated">
                  Revenue Generated
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.revenueGenerated ? "red" : "#ddd" }}
                  type="number"
                  id="revenueGenerated"
                  value={revenueGenerated}
                  onChange={(e) => setRevenueGenerated(e.target.value)}
                  placeholder="Enter Revenue Generated"
                />
                {errors.revenueGenerated && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.revenueGenerated}</span>
                )}

                <label style={labelStyle} htmlFor="oneTimeRevenue">
                  One-Time Revenue
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.oneTimeRevenue ? "red" : "#ddd" }}
                  type="number"
                  id="oneTimeRevenue"
                  value={oneTimeRevenue}
                  onChange={(e) => setOneTimeRevenue(e.target.value)}
                  placeholder="Enter One-Time Revenue"
                />
                {errors.oneTimeRevenue && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.oneTimeRevenue}</span>
                )}

                <label style={labelStyle} htmlFor="recurringRevenue">
                  Recurring Revenue
                </label>
                <input
                  style={{ ...inputStyle, borderColor: errors.recurringRevenue ? "red" : "#ddd" }}
                  type="number"
                  id="recurringRevenue"
                  value={recurringRevenue}
                  onChange={(e) => setRecurringRevenue(e.target.value)}
                  placeholder="Enter Recurring Revenue"
                />
                {errors.recurringRevenue && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.recurringRevenue}</span>
                )}

                <label style={labelStyle} htmlFor="status">
                  Status*
                </label>
                <select
                  style={{ ...selectStyle, borderColor: errors.status ? "red" : "#ddd" }}
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select Status
                  </option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <span style={{ color: "red", fontSize: "12px" }}>{errors.status}</span>
                )}

                <label style={labelStyle}>Project IDs</label>
                {loadingProjects ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 2 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box sx={checkboxContainerStyle}>
                    {projects.map((project) => (
                      <FormControlLabel
                        key={project.id}
                        control={
                          <Checkbox
                            checked={selectedProjects.includes(project.projectId)}
                            onChange={() => handleProjectChange(project.projectId)}
                            sx={{
                              "& .MuiSvgIcon-root": { fontSize: "20px" },
                            }}
                          />
                        }
                        label={project.projectId || "Unknown"}
                        sx={{
                          display: "block",
                          margin: "0",
                          "& .MuiFormControlLabel-label": {
                            fontSize: "12px",
                            color: "#555",
                          },
                        }}
                      />
                    ))}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  Click to select or deselect project IDs
                </Typography>
              </form>
            </fieldset>
          </DialogContent>
          <DialogActions sx={{ padding: "16px 24px", justifyContent: "center" }}>
            <button style={buttonStyle} onClick={handleClose}>
              Cancel
            </button>
            <button style={buttonStyle} onClick={handleSubmit}>
              Save
            </button>
          </DialogActions>
        </Dialog>
      )}
      {!isReadOnly && (
        <Dialog
          open={confirmUpdateOpen}
          onClose={() => setConfirmUpdateOpen(false)}
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: darkMode ? "background.default" : "background.paper",
              borderRadius: "12px",
            },
          }}
        >
          <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
            Ready to update client details?
          </DialogTitle>
          <DialogActions>
            <Button
              onClick={() => setConfirmUpdateOpen(false)}
              sx={{
                color: darkMode ? "#ffffff" : "#000000",
                textTransform: "none",
                fontWeight: "bold",
                fontSize: "16px",
                padding: "8px 20px",
                borderRadius: "8px",
                border: darkMode ? "1px solid #ffffff" : "1px solid #000000",
                "&:hover": {
                  backgroundColor: darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
                  color: darkMode ? "#ffffff" : "#000000",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUpdate}
              sx={{
                backgroundColor: darkMode ? "#4fc3f7" : "#1976d2",
                color: "#ffffff",
                textTransform: "none",
                fontWeight: "bold",
                fontSize: "16px",
                padding: "8px 20px",
                borderRadius: "8px",
                "&:hover": {
                  backgroundColor: darkMode ? "#29b6f6" : "#1565c0",
                },
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default ManageClient;
