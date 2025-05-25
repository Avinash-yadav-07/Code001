import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  Typography,
  Box,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  CardContent,
  CardActions,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import DataTable from "examples/Tables/DataTable";
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import Autocomplete from "@mui/material/Autocomplete";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const earningCategories = [
  "Project Revenue",
  "Service Revenue",
  "Product Sales",
  "Subscription Revenue",
  "Licensing Revenue",
  "Commission Income",
  "Advertising Revenue",
  "Consulting Fees",
  "Investment Income",
  "Rental or Leasing Income",
];

const Option = ({ id, onClick, children }) => (
  <li key={id} onClick={onClick}>
    {children}
  </li>
);

Option.propTypes = {
  id: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

const renderOption = ({ onClick }, option, label) => (
  <Option id={option.id} onClick={onClick}>
    {label(option)}
  </Option>
);

renderOption.propTypes = {
  onClick: PropTypes.func.isRequired,
};

const ManageEarnings = () => {
  const [earnings, setEarnings] = useState([]);
  const [selectedEarning, setSelectedEarning] = useState(null);
  const [open, setOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [reference, setReference] = useState(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [excelOption, setExcelOption] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  // Check if an ID is unique in Firestore
  const checkUniqueId = async (collectionName, field, value) => {
    try {
      const q = query(
        collection(db, collectionName),
        where(field, "==", value)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error(`Error checking unique ${field}:`, error);
      return false;
    }
  };

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

    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          blankrows: false,
        });

        const validAccountIds = accounts.map((a) => a.accountId);

        // Normalize column names for Excel import
        const normalizeColumnName = (name) => {
          if (!name) return "";
          const cleanName = name.trim().toLowerCase().replace(/\s+/g, "");
          if (cleanName.includes("earningid")) return "Earning ID";
          if (cleanName.includes("category")) return "Category";
          if (cleanName.includes("amount")) return "Amount";
          if (cleanName.includes("date")) return "Date";
          if (cleanName.includes("referenceid")) return "Reference ID";
          if (cleanName.includes("accountid")) return "Account ID";
          return name;
        };

        const normalizedData = jsonData.map((row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeColumnName(key)] = row[key];
          });
          return normalizedRow;
        });

        for (const earning of normalizedData) {
          let newEarningId = generateEarningId();
          let attempts = 0;
          const maxAttempts = 10;

          // Ensure unique earning ID
          while (attempts < maxAttempts) {
            const isEarningIdUnique = await checkUniqueId(
              "earnings",
              "earningId",
              newEarningId
            );
            if (isEarningIdUnique) break;
            newEarningId = generateEarningId();
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error("Could not generate unique earning ID");
            toast.error(
              "Failed to generate unique earning ID. Please try again."
            );
            return;
          }

          // Validate required fields
          if (
            !earning["Category"]?.trim() ||
            !earning["Amount"] ||
            !earning["Date"] ||
            !earning["Account ID"]?.trim()
          ) {
            console.error(
              "Missing required fields in earning:",
              earning["Earning ID"]
            );
            toast.error(
              `Missing required fields for earning ${
                earning["Earning ID"] || "unknown"
              }. Required: Category, Amount, Date, Account ID.`
            );
            return;
          }

          // Validate category
          const normalizedCategory = earning["Category"].trim();
          if (
            !earningCategories
              .map((c) => c.toLowerCase())
              .includes(normalizedCategory.toLowerCase())
          ) {
            console.error(
              "Invalid category for earning:",
              earning["Earning ID"]
            );
            toast.error(
              `Invalid category "${earning["Category"]}" for earning ${
                earning["Earning ID"] || "unknown"
              }.`
            );
            return;
          }

          // Validate amount
          const amount = parseFloat(earning["Amount"]);
          if (isNaN(amount) || amount <= 0) {
            console.error("Invalid amount for earning:", earning["Earning ID"]);
            toast.error(
              `Amount must be positive for earning ${
                earning["Earning ID"] || "unknown"
              }.`
            );
            return;
          }

          // Validate date
          let earningDate = earning["Date"];
          if (earningDate instanceof Date) {
            earningDate = earningDate.toISOString().substring(0, 10);
          } else {
            earningDate = new Date(earning["Date"]?.toString());
            if (isNaN(earningDate.getTime())) {
              console.error("Invalid date for earning:", earning["Earning ID"]);
              toast.error(
                `Invalid date "${earning["Date"]}" for earning ${
                  earning["Earning ID"] || "unknown"
                }.`
              );
              return;
            }
            earningDate = earningDate.toISOString().substring(0, 10);
          }

          // Validate account ID
          const accountId = earning["Account ID"]?.trim();
          if (!validAccountIds.includes(accountId)) {
            console.error(
              "Invalid account ID for earning:",
              earning["Earning ID"]
            );
            toast.error(
              `Invalid account ID "${earning["Account ID"]}" for earning ${
                earning["Earning ID"] || "unknown"
              }.`
            );
            return;
          }

          // Create new earning object
          const newEarning = {
            earningId: newEarningId,
            category: normalizedCategory,
            amount: amount,
            date: Timestamp.fromDate(new Date(earningDate)),
            referenceId: earning["Reference ID"]?.toString().trim() || null,
            accountId: accountId,
            createdBy: user.uid,
          };

          // Save earning to Firestore
          try {
            await addDoc(collection(db, "earnings"), newEarning);
          } catch (error) {
            console.error("Error adding earning from Excel:", error);
            toast.error(
              `Failed to add earning ${
                earning["Earning ID"] || "unknown"
              }. Error: ${error.message}`
            );
            return;
          }
        }
        toast.success("Earnings imported successfully!");
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast.error(
          "Failed to process Excel file. Please ensure it contains the required fields (Category, Amount, Date, Account ID) and is in a valid format (.xlsx, .xls, .csv)."
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
    const exportData = earnings.map((earning) => ({
      "Earning ID": earning.earningId || earning.id,
      Category: earning.category || "N/A",
      Amount: Number(earning.amount || 0).toFixed(2),
      Date: earning.date || "N/A",
      "Reference ID": earning.referenceId || "N/A",
      "Account ID": earning.accountId || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Earnings");
    XLSX.writeFile(workbook, "earnings_export.xlsx");
  };

  // Handle dummy Excel download
  const handleDownloadDummyExcel = () => {
    const dummyData = [
      {
        "Earning ID": "",
        Category: "",
        Amount: "",
        Date: "",
        "Reference ID": "",
        "Account ID": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dummyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Earnings");
    XLSX.writeFile(workbook, "earnings_dummy.xlsx");
  };

  // Generate earning ID
  const generateEarningId = () =>
    `E-${Math.floor(10000 + Math.random() * 90000)}`;

  // Fetch user roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const q = query(
            collection(db, "users"),
            where("email", "==", user.email)
          );
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

  const isReadOnly =
    userRoles.includes("ManageEarning:read") &&
    !userRoles.includes("ManageEarning:full access");
  const hasAccess =
    userRoles.includes("ManageEarning:read") ||
    userRoles.includes("ManageEarning:full access");

  // Fetch earnings with real-time listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user");
      return;
    }

    let earningsQuery = query(
      collection(db, "earnings"),
      where("accountId", "!=", null) // Ensure earnings have an account
    );
    if (isReadOnly) {
      earningsQuery = query(earningsQuery, where("createdBy", "==", user.uid));
    }

    const unsubscribe = onSnapshot(
      earningsQuery,
      (snapshot) => {
        const earningsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: data.date?.toDate().toLocaleDateString() || "N/A",
          };
        });
        setEarnings(earningsData);
      },
      (error) => {
        console.error("Error fetching earnings:", error);
      }
    );
    return () => unsubscribe();
  }, [isReadOnly]);

  // Fetch clients, accounts, and projects with where clauses
  const fetchReferenceData = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        return;
      }

      // Fetch active clients
      const clientsQuery = query(
        collection(db, "clients"),
        where("status", "==", "Active")
      );

      // Fetch active accounts
      const accountsQuery = query(
        collection(db, "accounts"),
        where("status", "==", "Active")
      );

      // Fetch active projects
      const projectsQuery = query(
        collection(db, "projects"),
        where("status", "==", "Active")
      );

      const [clientsSnapshot, accountsSnapshot, projectsSnapshot] =
        await Promise.all([
          getDocs(clientsQuery),
          getDocs(accountsQuery),
          getDocs(projectsQuery),
        ]);

      setClients(
        clientsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setAccounts(
        accountsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setProjects(
        projectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (error) {
      console.error("Error fetching reference data:", error);
    }
  }, []);

  // Trigger data fetch after roles are loaded
  useEffect(() => {
    if (!loadingRoles) {
      fetchReferenceData();
    }
  }, [loadingRoles, fetchReferenceData]);

  // Reset reference when category changes
  useEffect(() => {
    setReference(null);
  }, [category]);

  const validateForm = () => {
    const errors = {};
    if (!category) errors.category = "Category is required";
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      errors.amount = "Valid amount is required";
    if (!selectedAccount) errors.account = "Account is required";
    if (!date) errors.date = "Date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEarning = async () => {
    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    const newEarning = {
      earningId: generateEarningId(),
      category,
      referenceId:
        reference && typeof reference === "object"
          ? reference.projectId ||
            reference.clientId ||
            reference.accountId ||
            reference.name
          : reference || "N/A",
      amount: Number(amount) || 0,
      date: date ? Timestamp.fromDate(new Date(date)) : Timestamp.now(),
      accountId: selectedAccount.accountId,
      createdBy: auth.currentUser?.uid || "unknown",
    };

    try {
      await addDoc(collection(db, "earnings"), newEarning);
      toast.success("Earning added successfully!");
      handleClose();
    } catch (error) {
      console.error("Error adding earning:", error);
      toast.error("Failed to add earning. Please try again.");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCategory("");
    setReference(null);
    setAmount("");
    setDate("");
    setSelectedAccount(null);
    setFormErrors({});
  };

  const EarningDetails = ({ label, value }) => (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography
        display="block"
        variant="caption"
        color="text"
        fontWeight="medium"
      >
        {label}
      </MDTypography>
      <MDTypography
        variant="caption"
        sx={{ color: darkMode ? "white" : "inherit" }}
      >
        {value}
      </MDTypography>
    </MDBox>
  );

  EarningDetails.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  };

  const AmountBadge = ({ amount }) => (
    <MDBox ml={-1}>
      <MDBadge
        badgeContent={`$${Number(amount).toFixed(2)}`}
        color="success"
        variant="gradient"
        size="sm"
      />
    </MDBox>
  );

  AmountBadge.propTypes = {
    amount: PropTypes.number.isRequired,
  };

  const tableData = {
    columns: [
      { Header: "Earning ID", accessor: "earningId", align: "left" },
      { Header: "Category", accessor: "category", align: "left" },
      { Header: "Reference", accessor: "reference", align: "left" },
      { Header: "Account", accessor: "account", align: "left" },
      { Header: "Amount", accessor: "amount", align: "center" },
      { Header: "Date", accessor: "date", align: "center" },
      { Header: "Actions", accessor: "actions", align: "center" },
    ],
    rows: earnings.map((earning) => ({
      earningId: (
        <MDTypography
          variant="caption"
          fontWeight="medium"
          sx={{ color: darkMode ? "white" : "inherit" }}
        >
          {earning.earningId || earning.id}
        </MDTypography>
      ),
      category: (
        <MDTypography
          variant="caption"
          fontWeight="medium"
          sx={{ color: darkMode ? "white" : "inherit" }}
        >
          {earning.category || "N/A"}
        </MDTypography>
      ),
      reference: (
        <EarningDetails
          label="Reference"
          value={earning.referenceId || "N/A"}
        />
      ),
      account: (
        <MDTypography
          variant="caption"
          fontWeight="medium"
          sx={{ color: darkMode ? "white" : "inherit" }}
        >
          {earning.accountId || "N/A"}
        </MDTypography>
      ),
      amount: <AmountBadge amount={Number(earning.amount) || 0} />,
      date: (
        <MDTypography
          variant="caption"
          color="text"
          fontWeight="medium"
          sx={{ color: darkMode ? "white" : "inherit" }}
        >
          {earning.date}
        </MDTypography>
      ),
      actions: (
        <MDBox display="flex" justifyContent="center">
          <Button
            variant="gradient"
            color={darkMode ? "dark" : "info"}
            onClick={() => {
              setSelectedEarning(earning);
              setViewDetailsOpen(true);
            }}
          >
            View Details
          </Button>
        </MDBox>
      ),
    })),
  };

  // Form styles from ManageExpenses
  const formContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow: "0 0 20px rgba(0, 0,0,0.2)",
    padding: "10px 20px",
    width: "100%",
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
    color: "#333",
  };

  if (loadingRoles) {
    return <div>Loading...</div>;
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" />;
  }

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
          backgroundColor: darkMode
            ? "rgba(33, 33, 33, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          width: {
            xs: "100%",
            md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 260px)",
          },
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
                <MDTypography variant="h6" color={darkMode ? "white" : "white"}>
                  Earnings Management
                </MDTypography>
              </MDBox>
              <MDBox
                pt={3}
                pb={2}
                px={2}
                display="flex"
                alignItems="center"
                gap={2}
                justifyContent="space-between"
              >
                <Box display="flex" gap={2}>
                  {!isReadOnly && (
                    <>
                      <Button
                        variant="gradient"
                        color={darkMode ? "dark" : "info"}
                        onClick={() => setOpen(true)}
                      >
                        Add Earning
                      </Button>
                      <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel
                          id="excel-options-label"
                          sx={{ color: darkMode ? "white" : "black" }}
                        >
                          Excel Options
                        </InputLabel>
                        <Select
                          labelId="excel-options-label"
                          value={excelOption}
                          onChange={handleExcelOptionChange}
                          label="Excel Options"
                          sx={{
                            height: "36px",
                            "& .MuiSelect-select": {
                              padding: "8px",
                              color: darkMode ? "white" : "black",
                            },
                            "& .MuiSvgIcon-root": {
                              color: darkMode ? "white" : "black",
                            },
                          }}
                        >
                          <MenuItem value="" disabled>
                            Select an option
                          </MenuItem>
                          <MenuItem value="upload">Upload Excel</MenuItem>
                          <MenuItem value="download">Download Excel</MenuItem>
                          <MenuItem value="downloadDummy">
                            Download Dummy Excel
                          </MenuItem>
                        </Select>
                      </FormControl>
                      <input
                        id="file-upload"
                        type="file"
                        hidden
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                      />
                    </>
                  )}
                </Box>
              </MDBox>
              <MDBox pt={3} pb={2} px={2}>
                <DataTable
                  table={tableData}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
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
          fullWidth
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: "#f3f3f3",
              borderRadius: "8px",
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
              width: "400px",
              margin: "auto",
            },
          }}
        >
          <DialogTitle sx={{ ...titleStyle }}>Add Earning</DialogTitle>
          <DialogContent sx={{ padding: "10px 20px" }}>
            <fieldset style={formStyle}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddEarning();
                }}
              >
                <label style={labelStyle} htmlFor="category">
                  Category*
                </label>
                <select
                  style={{
                    ...selectStyle,
                    borderColor: formErrors.category ? "red" : "#ddd",
                  }}
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {earningCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {formErrors.category && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {formErrors.category}
                  </span>
                )}

                {category && (
                  <>
                    {category === "Project Revenue" && (
                      <>
                        <label style={labelStyle} htmlFor="project">
                          Project
                        </label>
                        <Autocomplete
                          options={projects}
                          getOptionLabel={(option) =>
                            option.projectId || option.name || "N/A"
                          }
                          value={reference}
                          onChange={(e, newValue) => setReference(newValue)}
                          renderInput={(params) => (
                            <input
                              {...params}
                              style={selectStyle}
                              placeholder="Select Project"
                            />
                          )}
                        />
                      </>
                    )}
                    {(category === "Service Revenue" ||
                      category === "Subscription Revenue" ||
                      category === "Licensing Revenue" ||
                      category === "Consulting Fees") && (
                      <>
                        <label style={labelStyle} htmlFor="client">
                          Client
                        </label>
                        <Autocomplete
                          options={clients}
                          getOptionLabel={(option) =>
                            option.clientId || option.name || "N/A"
                          }
                          value={reference}
                          onChange={(e, newValue) => setReference(newValue)}
                          renderInput={(params) => (
                            <input
                              {...params}
                              style={selectStyle}
                              placeholder="Select Client"
                            />
                          )}
                        />
                      </>
                    )}
                    {(category === "Commission Income" ||
                      category === "Advertising Revenue" ||
                      category === "Rental or Leasing Income") && (
                      <>
                        <label style={labelStyle} htmlFor="account">
                          Account
                        </label>
                        <Autocomplete
                          options={accounts}
                          getOptionLabel={(option) => option.accountId || "N/A"}
                          value={reference}
                          onChange={(e, newValue) => setReference(newValue)}
                          renderInput={(params) => (
                            <input
                              {...params}
                              style={selectStyle}
                              placeholder="Select Account"
                            />
                          )}
                        />
                      </>
                    )}
                    {(category === "Product Sales" ||
                      category === "Investment Income") && (
                      <>
                        <label style={labelStyle} htmlFor="reference">
                          Reference Details
                        </label>
                        <input
                          style={inputStyle}
                          type="text"
                          id="reference"
                          value={reference || ""}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="Enter reference details"
                        />
                      </>
                    )}
                  </>
                )}

                <label style={labelStyle} htmlFor="account">
                  Account*
                </label>
                <Autocomplete
                  options={accounts}
                  getOptionLabel={(option) => option.accountId || "N/A"}
                  value={selectedAccount}
                  onChange={(e, newValue) => setSelectedAccount(newValue)}
                  renderInput={(params) => (
                    <input
                      {...params}
                      style={{
                        ...selectStyle,
                        borderColor: formErrors.account ? "red" : "#ddd",
                      }}
                      placeholder="Select Account"
                      required
                    />
                  )}
                />
                {formErrors.account && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {formErrors.account}
                  </span>
                )}

                <label style={labelStyle} htmlFor="amount">
                  Amount*
                </label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.amount ? "red" : "#ddd",
                  }}
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
                {formErrors.amount && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {formErrors.amount}
                  </span>
                )}

                <label style={labelStyle} htmlFor="date">
                  Date*
                </label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.date ? "red" : "#ddd",
                  }}
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                {formErrors.date && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {formErrors.date}
                  </span>
                )}
              </form>
            </fieldset>
          </DialogContent>
          <DialogActions
            sx={{ padding: "16px 24px", justifyContent: "center" }}
          >
            <button style={buttonStyle} onClick={handleClose}>
              Cancel
            </button>
            <button style={buttonStyle} onClick={handleAddEarning}>
              Save
            </button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: darkMode
              ? "background.default"
              : "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
          Earning Details
        </DialogTitle>
        <DialogContent>
          {selectedEarning && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <EarningDetails
                  label="Earning ID"
                  value={selectedEarning.earningId || "N/A"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails
                  label="Category"
                  value={selectedEarning.category || "N/A"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails
                  label="Reference"
                  value={selectedEarning.referenceId || "N/A"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails
                  label="Account ID"
                  value={selectedEarning.accountId || "N/A"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails
                  label="Amount"
                  value={`$${Number(selectedEarning.amount || 0).toFixed(2)}`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails
                  label="Date"
                  value={selectedEarning.date || "N/A"}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageEarnings;
