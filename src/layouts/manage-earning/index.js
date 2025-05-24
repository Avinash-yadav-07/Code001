import React, { useState, useEffect, useCallback } from "react";
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

// Reusable Option component for Autocomplete renderOption
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

// Reusable renderOption function with propTypes
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

  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  // Fetch user roles
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

  const isReadOnly =
    userRoles.includes("ManageEarning:read") && !userRoles.includes("ManageEarning:full access");
  const hasAccess =
    userRoles.includes("ManageEarning:read") || userRoles.includes("ManageEarning:full access");

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
      const clientsQuery = query(collection(db, "clients"), where("status", "==", "Active"));

      // Fetch active accounts
      const accountsQuery = query(collection(db, "accounts"), where("status", "==", "Active"));

      // Fetch active projects
      const projectsQuery = query(collection(db, "projects"), where("status", "==", "Active"));

      const [clientsSnapshot, accountsSnapshot, projectsSnapshot] = await Promise.all([
        getDocs(clientsQuery),
        getDocs(accountsQuery),
        getDocs(projectsQuery),
      ]);

      setClients(clientsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setAccounts(accountsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setProjects(projectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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

  const EarningDetails = ({ label, value }) => (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography display="block" variant="caption" color="text" fontWeight="medium">
        {label}
      </MDTypography>
      <MDTypography variant="caption" sx={{ color: darkMode ? "white" : "inherit" }}>
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
      reference: <EarningDetails label="Reference" value={earning.referenceId || "N/A"} />,
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

  const handleAddEarning = async () => {
    if (!selectedAccount) {
      alert("Please select an account.");
      return;
    }

    const newEarning = {
      earningId: `E-${Math.floor(10000 + Math.random() * 90000)}`,
      category,
      referenceId:
        reference && typeof reference === "object"
          ? reference.projectId || reference.clientId || reference.accountId || reference.name
          : reference || "N/A",
      amount: Number(amount) || 0,
      date: date ? Timestamp.fromDate(new Date(date)) : Timestamp.now(),
      accountId: selectedAccount.accountId,
      createdBy: auth.currentUser?.uid || "unknown",
    };

    try {
      await addDoc(collection(db, "earnings"), newEarning);
      handleClose();
    } catch (error) {
      console.error("Error adding earning:", error);
      alert("Failed to add earning. Please try again.");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCategory("");
    setReference(null);
    setAmount("");
    setDate("");
    setSelectedAccount(null);
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
                <MDTypography variant="h6" color={darkMode ? "white" : "white"}>
                  Earnings Management
                </MDTypography>
              </MDBox>
              <MDBox pt={3} pb={2} px={2}>
                {!isReadOnly && (
                  <Button
                    variant="gradient"
                    color={darkMode ? "dark" : "info"}
                    onClick={() => setOpen(true)}
                    sx={{ mb: 2 }}
                  >
                    Add Earning
                  </Button>
                )}
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
          maxWidth="md"
          fullWidth
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: darkMode ? "background.default" : "background.paper",
            },
          }}
        >
          <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>Add New Earning</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Earning Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  sx={{
                    input: { color: darkMode ? "white" : "black" },
                    "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                  }}
                >
                  {earningCategories.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {category && (
                <>
                  {category === "Project Revenue" && (
                    <Grid item xs={12}>
                      <Autocomplete
                        options={projects}
                        getOptionLabel={(option) => option.projectId || option.name || "N/A"}
                        value={reference}
                        onChange={(e, newValue) => setReference(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Project"
                            fullWidth
                            sx={{
                              input: { color: darkMode ? "white" : "black" },
                              "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                            }}
                          />
                        )}
                        renderOption={(props, option) =>
                          renderOption(props, option, (opt) => opt.projectId || opt.name || "N/A")
                        }
                      />
                    </Grid>
                  )}
                  {(category === "Service Revenue" ||
                    category === "Subscription Revenue" ||
                    category === "Licensing Revenue" ||
                    category === "Consulting Fees") && (
                    <Grid item xs={12}>
                      <Autocomplete
                        options={clients}
                        getOptionLabel={(option) => option.clientId || option.name || "N/A"}
                        value={reference}
                        onChange={(e, newValue) => setReference(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Client"
                            fullWidth
                            sx={{
                              input: { color: darkMode ? "white" : "black" },
                              "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                            }}
                          />
                        )}
                        renderOption={(props, option) =>
                          renderOption(props, option, (opt) => opt.clientId || opt.name || "N/A")
                        }
                      />
                    </Grid>
                  )}
                  {(category === "Commission Income" ||
                    category === "Advertising Revenue" ||
                    category === "Rental or Leasing Income") && (
                    <Grid item xs={12}>
                      <Autocomplete
                        options={accounts}
                        getOptionLabel={(option) => option.accountId || "N/A"}
                        value={selectedAccount}
                        onChange={(e, newValue) => setSelectedAccount(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Account"
                            fullWidth
                            sx={{
                              input: { color: darkMode ? "white" : "black" },
                              "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                            }}
                          />
                        )}
                        renderOption={(props, option) =>
                          renderOption(props, option, (opt) => opt.accountId || "N/A")
                        }
                      />
                    </Grid>
                  )}
                  {(category === "Product Sales" || category === "Investment Income") && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Reference Details"
                        value={reference || ""}
                        onChange={(e) => setReference(e.target.value)}
                        sx={{
                          input: { color: darkMode ? "white" : "black" },
                          "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                        }}
                      />
                    </Grid>
                  )}
                </>
              )}

              <Grid item xs={12}>
                <Autocomplete
                  options={accounts}
                  getOptionLabel={(option) => option.accountId || "N/A"}
                  value={selectedAccount}
                  onChange={(e, newValue) => setSelectedAccount(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Account"
                      fullWidth
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  )}
                  renderOption={(props, option) =>
                    renderOption(props, option, (opt) => opt.accountId || "N/A")
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{
                    input: { color: darkMode ? "white" : "black" },
                    "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    input: { color: darkMode ? "white" : "black" },
                    "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleAddEarning} color="primary">
              Save
            </Button>
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
            backgroundColor: darkMode ? "background.default" : "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>Earning Details</DialogTitle>
        <DialogContent>
          {selectedEarning && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <EarningDetails label="Earning ID" value={selectedEarning.earningId || "N/A"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails label="Category" value={selectedEarning.category || "N/A"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails label="Reference" value={selectedEarning.referenceId || "N/A"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails label="Account ID" value={selectedEarning.accountId || "N/A"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails
                  label="Amount"
                  value={`$${Number(selectedEarning.amount || 0).toFixed(2)}`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <EarningDetails label="Date" value={selectedEarning.date || "N/A"} />
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
