import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { Navigate } from "react-router-dom";

const ManageCustomer = () => {
  const [open, setOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [npsUpdateOpen, setNpsUpdateOpen] = useState(false);
  const [csatUpdateOpen, setCsatUpdateOpen] = useState(false);
  const [chsUpdateOpen, setChsUpdateOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [supportCustomer, setSupportCustomer] = useState(null);
  const [upgradeCustomer, setUpgradeCustomer] = useState(null);
  const [cancelCustomer, setCancelCustomer] = useState(null);
  const [updateMetricCustomer, setUpdateMetricCustomer] = useState(null);
  const [dateFilterType, setDateFilterType] = useState("all");
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("");
  const [projectIds, setProjectIds] = useState([]);
  const [signUpDate, setSignUpDate] = useState(null);
  const [nps, setNps] = useState("");
  const [npsDate, setNpsDate] = useState(null);
  const [csat, setCsat] = useState("");
  const [csatDate, setCsatDate] = useState(null);
  const [chs, setChs] = useState("");
  const [chsDate, setChsDate] = useState(null);
  const [cltv, setCltv] = useState("");
  const [feature, setFeature] = useState("");
  const [supportProjectIds, setSupportProjectIds] = useState([]);
  const [issueDescription, setIssueDescription] = useState("");
  const [numberOfIssues, setNumberOfIssues] = useState("");
  const [complaintDate, setComplaintDate] = useState(null);
  const [resolvedDate, setResolvedDate] = useState(null);
  const [responseChannel, setResponseChannel] = useState([]);
  const [upgradeSubscriptionTier, setUpgradeSubscriptionTier] = useState("premium");
  const [planUpgradeDate, setPlanUpgradeDate] = useState(null);
  const [cancellationDate, setCancellationDate] = useState(null);
  const [churnReason, setChurnReason] = useState("");
  const [projects, setProjects] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [latestMetrics, setLatestMetrics] = useState({});

  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  const responseChannelOptions = ["Email", "Chat", "Call"];
  const churnReasonOptions = ["Price", "Service", "Features", "Other", "None"];
  const featureOptions = ["Core", "Advanced", "Integrations"];

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
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
        }
      }
      setLoadingRoles(false);
    };

    fetchUserRoles();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCustomersAndMetrics = async () => {
      try {
        const customerSnapshot = await getDocs(collection(db, "customers"));
        const customersData = customerSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate()
            : new Date(doc.data().createdAt),
          signUpDate: doc.data().signUpDate?.toDate
            ? doc.data().signUpDate.toDate()
            : null,
        }));

        const metricsSnapshot = await getDocs(collection(db, "customerMetrics"));
        const metricsData = metricsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          metricDate: doc.data().metricDate?.toDate
            ? doc.data().metricDate.toDate()
            : new Date(doc.data().metricDate),
        }));

        const latestMetricsData = {};
        customersData.forEach((customer) => {
          const customerMetrics = metricsData.filter(
            (metric) => metric.customerId === customer.customerId
          );
          const latestNps = customerMetrics
            .filter((m) => m.metricType === "nps")
            .sort((a, b) => b.metricDate - a.metricDate)[0];
          const latestCsat = customerMetrics
            .filter((m) => m.metricType === "csat")
            .sort((a, b) => b.metricDate - a.metricDate)[0];
          const latestChs = customerMetrics
            .filter((m) => m.metricType === "chs")
            .sort((a, b) => b.metricDate - a.metricDate)[0];
          latestMetricsData[customer.customerId] = {
            nps: latestNps ? { value: latestNps.value, date: latestNps.metricDate } : null,
            csat: latestCsat ? { value: latestCsat.value, date: latestCsat.metricDate } : null,
            chs: latestChs ? { value: latestChs.value, date: latestChs.metricDate } : null,
          };
        });

        if (isMounted) {
          setCustomers(customersData);
          setFilteredCustomers(customersData);
          setLatestMetrics(latestMetricsData);
        }
      } catch (error) {
        console.error("Error fetching customers or metrics:", error);
      }
    };

    fetchCustomersAndMetrics();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        const projectsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          projectId: doc.data().projectId,
          name: doc.data().name || "Unnamed Project",
        }));
        setProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    let filtered = [...customers];
    if (searchTerm) {
      filtered = filtered.filter(
        (customer) =>
          customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const now = new Date();
    switch (dateFilterType) {
      case "today":
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return (
            customerDate.getDate() === now.getDate() &&
            customerDate.getMonth() === now.getMonth() &&
            customerDate.getFullYear() === now.getFullYear()
          );
        });
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return customerDate >= weekStart && customerDate <= now;
        });
        break;
      case "month":
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return (
            customerDate.getMonth() === now.getMonth() &&
            customerDate.getFullYear() === now.getFullYear()
          );
        });
        break;
      case "3months":
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return customerDate >= threeMonthsAgo && customerDate <= now;
        });
        break;
      case "year":
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return customerDate.getFullYear() === now.getFullYear();
        });
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          filtered = filtered.filter((customer) => {
            const customerDate = new Date(customer.createdAt);
            return customerDate >= customStartDate && customerDate <= customEndDate;
          });
        }
        break;
      default:
        break;
    }
    setFilteredCustomers(filtered);
  }, [customers, searchTerm, dateFilterType, customStartDate, customEndDate]);

  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleSupportOpen = (customer) => {
    setSupportCustomer(customer);
    setSupportProjectIds(customer.projectIds || []);
    setSupportOpen(true);
    resetSupportForm();
  };

  const handleUpgradeOpen = (customer) => {
    setUpgradeCustomer(customer);
    setPlanUpgradeDate(null);
    setUpgradeSubscriptionTier("premium");
    setUpgradeOpen(true);
  };

  const handleCancelOpen = (customer) => {
    setCancelCustomer(customer);
    setCancellationDate(null);
    setChurnReason("");
    setCancelOpen(true);
  };

  const handleNpsUpdateOpen = (customer) => {
    setUpdateMetricCustomer(customer);
    setNps("");
    setNpsDate(null);
    setNpsUpdateOpen(true);
  };

  const handleCsatUpdateOpen = (customer) => {
    setUpdateMetricCustomer(customer);
    setCsat("");
    setCsatDate(null);
    setCsatUpdateOpen(true);
  };

  const handleChsUpdateOpen = (customer) => {
    setUpdateMetricCustomer(customer);
    setChs("");
    setChsDate(null);
    setChsUpdateOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSupportClose = () => {
    setSupportOpen(false);
    resetSupportForm();
  };

  const handleUpgradeClose = () => {
    setUpgradeOpen(false);
    setUpgradeCustomer(null);
  };

  const handleCancelClose = () => {
    setCancelOpen(false);
    setCancelCustomer(null);
  };

  const handleNpsUpdateClose = () => {
    setNpsUpdateOpen(false);
    setUpdateMetricCustomer(null);
    setNps("");
    setNpsDate(null);
  };

  const handleCsatUpdateClose = () => {
    setCsatUpdateOpen(false);
    setUpdateMetricCustomer(null);
    setCsat("");
    setCsatDate(null);
  };

  const handleChsUpdateClose = () => {
    setChsUpdateOpen(false);
    setUpdateMetricCustomer(null);
    setChs("");
    setChsDate(null);
  };

  const handleEdit = async (customer) => {
    setEditingCustomer(customer);
    setCustomerName(customer.customerName || "");
    setEmail(customer.email || "");
    setPhone(customer.phone || "");
    setAddress(customer.address || "");
    setStatus(customer.status || "");
    setSubscriptionTier(customer.subscriptionTier || "");
    setProjectIds(customer.projectIds || []);
    setSignUpDate(customer.signUpDate || null);
    setFeature(customer.feature || "");
    setCltv(customer.cltv || "");
    setNps("");
    setNpsDate(null);
    setCsat("");
    setCsatDate(null);
    setChs("");
    setChsDate(null);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!customerName || !email || !status || !subscriptionTier || !feature) {
      alert("Customer Name, Email, Status, Subscription Tier, and Feature are required.");
      return;
    }
    if ((nps && !npsDate) || (!nps && npsDate)) {
      alert("Both NPS value and NPS Date are required if one is provided.");
      return;
    }
    if ((csat && !csatDate) || (!csat && csatDate)) {
      alert("Both CSAT value and CSAT Date are required if one is provided.");
      return;
    }
    if ((chs && !chsDate) || (!chs && chsDate)) {
      alert("Both CHS value and CHS Date are required if one is provided.");
      return;
    }

    const newCustomer = {
      customerId: editingCustomer ? editingCustomer.customerId : generateCustomerId(),
      customerName,
      email,
      phone,
      address,
      status,
      subscriptionTier,
      projectIds: projectIds.length > 0 ? projectIds : [],
      signUpDate: signUpDate || new Date(),
      feature,
      cltv: Number(cltv) || 0,
      createdAt: new Date(),
    };

    try {
      if (editingCustomer) {
        await updateDoc(doc(db, "customers", editingCustomer.id), newCustomer);
        setCustomers(
          customers.map((cust) =>
            cust.id === editingCustomer.id ? { id: cust.id, ...newCustomer } : cust
          )
        );
      } else {
        const docRef = await addDoc(collection(db, "customers"), newCustomer);
        setCustomers([...customers, { id: docRef.id, ...newCustomer }]);
      }

      // Save metrics to customerMetrics collection
      if (nps && npsDate && Number(nps) >= 0 && Number(nps) <= 100) {
        await addDoc(collection(db, "customerMetrics"), {
          customerId: newCustomer.customerId,
          metricType: "nps",
          value: Number(nps),
          metricDate: npsDate,
          createdAt: new Date(),
        });
      }
      if (csat && csatDate && Number(csat) >= 0 && Number(csat) <= 100) {
        await addDoc(collection(db, "customerMetrics"), {
          customerId: newCustomer.customerId,
          metricType: "csat",
          value: Number(csat),
          metricDate: csatDate,
          createdAt: new Date(),
        });
      }
      if (chs && chsDate) {
        await addDoc(collection(db, "customerMetrics"), {
          customerId: newCustomer.customerId,
          metricType: "chs",
          value: Number(chs),
          metricDate: chsDate,
          createdAt: new Date(),
        });
      }

      // Refresh metrics after saving
      const metricsSnapshot = await getDocs(collection(db, "customerMetrics"));
      const metricsData = metricsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        metricDate: doc.data().metricDate?.toDate
          ? doc.data().metricDate.toDate()
          : new Date(doc.data().metricDate),
      }));

      const latestMetricsData = {};
      customers.forEach((customer) => {
        const customerMetrics = metricsData.filter(
          (metric) => metric.customerId === customer.customerId
        );
        const latestNps = customerMetrics
          .filter((m) => m.metricType === "nps")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        const latestCsat = customerMetrics
          .filter((m) => m.metricType === "csat")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        const latestChs = customerMetrics
          .filter((m) => m.metricType === "chs")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        latestMetricsData[customer.customerId] = {
          nps: latestNps ? { value: latestNps.value, date: latestNps.metricDate } : null,
          csat: latestCsat ? { value: latestCsat.value, date: latestCsat.metricDate } : null,
          chs: latestChs ? { value: latestChs.value, date: latestChs.metricDate } : null,
        };
      });
      setLatestMetrics(latestMetricsData);

      handleClose();
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  const handleNpsUpdateSubmit = async () => {
    if (!nps || !npsDate) {
      alert("Both NPS value and NPS Date are required.");
      return;
    }
    if (Number(nps) < 0 || Number(nps) > 100) {
      alert("NPS must be between 0 and 100.");
      return;
    }
    if (!updateMetricCustomer) {
      alert("No customer selected for NPS update.");
      return;
    }

    try {
      await addDoc(collection(db, "customerMetrics"), {
        customerId: updateMetricCustomer.customerId,
        metricType: "nps",
        value: Number(nps),
        metricDate: npsDate,
        createdAt: new Date(),
      });

      // Refresh metrics
      const metricsSnapshot = await getDocs(collection(db, "customerMetrics"));
      const metricsData = metricsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        metricDate: doc.data().metricDate?.toDate
          ? doc.data().metricDate.toDate()
          : new Date(doc.data().metricDate),
      }));

      const latestMetricsData = {};
      customers.forEach((customer) => {
        const customerMetrics = metricsData.filter(
          (metric) => metric.customerId === customer.customerId
        );
        const latestNps = customerMetrics
          .filter((m) => m.metricType === "nps")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        const latestCsat = customerMetrics
          .filter((m) => m.metricType === "csat")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        const latestChs = customerMetrics
          .filter((m) => m.metricType === "chs")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        latestMetricsData[customer.customerId] = {
          nps: latestNps ? { value: latestNps.value, date: latestNps.metricDate } : null,
          csat: latestCsat ? { value: latestCsat.value, date: latestCsat.metricDate } : null,
          chs: latestChs ? { value: latestChs.value, date: latestChs.metricDate } : null,
        };
      });
      setLatestMetrics(latestMetricsData);

      handleNpsUpdateClose();
    } catch (error) {
      console.error("Error saving NPS:", error);
    }
  };

  const handleCsatUpdateSubmit = async () => {
    if (!csat || !csatDate) {
      alert("Both CSAT value and CSAT Date are required.");
      return;
    }
    if (Number(csat) < 0 || Number(csat) > 100) {
      alert("CSAT must be between 0 and 100.");
      return;
    }
    if (!updateMetricCustomer) {
      alert("No customer selected for CSAT update.");
      return;
    }

    try {
      await addDoc(collection(db, "customerMetrics"), {
        customerId: updateMetricCustomer.customerId,
        metricType: "csat",
        value: Number(csat),
        metricDate: csatDate,
        createdAt: new Date(),
      });

      // Refresh metrics
      const metricsSnapshot = await getDocs(collection(db, "customerMetrics"));
      const metricsData = metricsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        metricDate: doc.data().metricDate?.toDate
          ? doc.data().metricDate.toDate()
          : new Date(doc.data().metricDate),
      }));

      const latestMetricsData = {};
      customers.forEach((customer) => {
        const customerMetrics = metricsData.filter(
          (metric) => metric.customerId === customer.customerId
        );
        const latestNps = customerMetrics
          .filter((m) => m.metricType === "nps")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        const latestCsat = customerMetrics
          .filter((m) => m.metricType === "csat")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        const latestChs = customerMetrics
          .filter((m) => m.metricType === "chs")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        latestMetricsData[customer.customerId] = {
          nps: latestNps ? { value: latestNps.value, date: latestNps.metricDate } : null,
          csat: latestCsat ? { value: latestCsat.value, date: latestCsat.metricDate } : null,
          chs: latestChs ? { value: latestChs.value, date: latestChs.metricDate } : null,
        };
      });
      setLatestMetrics(latestMetricsData);

      handleCsatUpdateClose();
    } catch (error) {
      console.error("Error saving CSAT:", error);
    }
  };

  const handleChsUpdateSubmit = async () => {
    if (!chs || !chsDate) {
      alert("Both CHS value and CHS Date are required.");
      return;
    }
    if (!updateMetricCustomer) {
      alert("No customer selected for CHS update.");
      return;
    }

    try {
      await addDoc(collection(db, "customerMetrics"), {
        customerId: updateMetricCustomer.customerId,
        metricType: "chs",
        value: Number(chs),
        metricDate: chsDate,
        createdAt: new Date(),
      });

      // Refresh metrics
      const metricsSnapshot = await getDocs(collection(db, "customerMetrics"));
      const metricsData = metricsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        metricDate: doc.data().metricDate?.toDate
          ? doc.data().metricDate.toDate()
          : new Date(doc.data().metricDate),
      }));

      const latestMetricsData = {};
      customers.forEach((customer) => {
        const customerMetrics = metricsData.filter(
          (metric) => metric.customerId === customer.customerId
        );
        const latestNps = customerMetrics
          .filter((m) => m.metricType === "nps")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        const latestCsat = customerMetrics
          .filter((m) => m.metricType === "csat")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        const latestChs = customerMetrics
          .filter((m) => m.metricType === "chs")
          .sort((a, b) => b.metricDate - a.metricDate)[0];
        latestMetricsData[customer.customerId] = {
          nps: latestNps ? { value: latestNps.value, date: latestNps.metricDate } : null,
          csat: latestCsat ? { value: latestCsat.value, date: latestCsat.metricDate } : null,
          chs: latestChs ? { value: latestChs.value, date: latestChs.metricDate } : null,
        };
      });
      setLatestMetrics(latestMetricsData);

      handleChsUpdateClose();
    } catch (error) {
      console.error("Error saving CHS:", error);
    }
  };

  const handleSupportSubmit = async () => {
    if (!supportProjectIds.length || !issueDescription || !numberOfIssues || !complaintDate) {
      alert("Project IDs, Issue Description, Number of Issues, and Complaint Date are required.");
      return;
    }
    if (!supportCustomer) {
      alert("No customer selected for support ticket.");
      return;
    }

    const supportTicket = {
      customerId: supportCustomer.customerId,
      projectIds: supportProjectIds,
      issueDescription,
      numberOfIssues: Number(numberOfIssues),
      complaintDate,
      resolvedDate,
      responseChannel: responseChannel.length > 0 ? responseChannel : ["None"],
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, "supportTickets"), supportTicket);
      handleSupportClose();
    } catch (error) {
      console.error("Error saving support ticket:", error);
    }
  };

  const handleUpgradeSubmit = async () => {
    if (!planUpgradeDate) {
      alert("Plan Upgrade Date is required.");
      return;
    }
    if (!upgradeCustomer) {
      alert("No customer selected for upgrade.");
      return;
    }

    const upgradeData = {
      customerId: upgradeCustomer.customerId,
      subscriptionTier: upgradeSubscriptionTier,
      planUpgradeDate,
      projectIds: upgradeCustomer.projectIds || [],
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, "upgrades"), upgradeData);
      await updateDoc(doc(db, "customers", upgradeCustomer.id), {
        subscriptionTier: upgradeSubscriptionTier,
        status: "active",
      });
      setCustomers(
        customers.map((cust) =>
          cust.id === upgradeCustomer.id
            ? { ...cust, subscriptionTier: upgradeSubscriptionTier, status: "active" }
            : cust
        )
      );
      handleUpgradeClose();
    } catch (error) {
      console.error("Error saving upgrade:", error);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancellationDate || !churnReason) {
      alert("Cancellation Date and Churn Reason are required.");
      return;
    }
    if (!cancelCustomer) {
      alert("No customer selected for cancellation.");
      return;
    }

    const cancellationData = {
      customerId: cancelCustomer.customerId,
      cancellationDate,
      churnReason,
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, "cancellations"), cancellationData);
      await updateDoc(doc(db, "customers", cancelCustomer.id), {
        status: "inactive",
        churnReason,
      });
      setCustomers(
        customers.map((cust) =>
          cust.id === cancelCustomer.id
            ? { ...cust, status: "inactive", churnReason }
            : cust
        )
      );
      handleCancelClose();
    } catch (error) {
      console.error("Error saving cancellation:", error);
    }
  };

  const generateCustomerId = () => Math.floor(1000 + Math.random() * 9000).toString();

  const resetForm = () => {
    setCustomerName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setStatus("");
    setSubscriptionTier("");
    setProjectIds([]);
    setSignUpDate(null);
    setNps("");
    setNpsDate(null);
    setCsat("");
    setCsatDate(null);
    setChs("");
    setChsDate(null);
    setCltv("");
    setFeature("");
    setEditingCustomer(null);
  };

  const resetSupportForm = () => {
    setIssueDescription("");
    setNumberOfIssues("");
    setComplaintDate(null);
    setResolvedDate(null);
    setResponseChannel([]);
  };

  if (loadingRoles) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>Loading...</MDTypography>
      </Box>
    );
  }

  if (!userRoles.includes("ManageCustomer:read") && !userRoles.includes("ManageCustomer:full access")) {
    return <Navigate to="/unauthorized" />;
  }

  const isReadOnly =
    userRoles.includes("ManageCustomer:read") && !userRoles.includes("ManageCustomer:full access");

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
            left: { xs: "0", md: miniSidenav ? "80px" : "250px" },
            width: { xs: "100%", md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 250px)" },
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        />
        <MDBox
          p={3}
          sx={{
            marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
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
                  <MDTypography
                    variant="h6"
                    color={darkMode ? "white" : "white"}
                    sx={{
                      fontFamily: "'Poppins', 'Roboto', sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    Customer Management
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
                      <MDButton
                        variant="gradient"
                        color={darkMode ? "dark" : "info"}
                        onClick={handleClickOpen}
                      >
                        Add Customer
                      </MDButton>
                    )}
                    <TextField
                      label="Search by Name or Email"
                      variant="outlined"
                      size="small"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      sx={{
                        maxWidth: 300,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                          backgroundColor: darkMode ? "#424242" : "#fff",
                          color: darkMode ? "white" : "black",
                        },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Box>
                  <Box display="flex" gap={2} alignItems="center">
                    <FormControl variant="outlined" size="small">
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                        Date Filter
                      </InputLabel>
                      <Select
                        value={dateFilterType}
                        onChange={(e) => setDateFilterType(e.target.value)}
                        label="Date Filter"
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          minWidth: 120,
                        }}
                      >
                        <MenuItem value="all">All Dates</MenuItem>
                        <MenuItem value="today">Today</MenuItem>
                        <MenuItem value="week">This Week</MenuItem>
                        <MenuItem value="month">This Month</MenuItem>
                        <MenuItem value="3months">Last 3 Months</MenuItem>
                        <MenuItem value="year">This Year</MenuItem>
                        <MenuItem value="custom">Custom Range</MenuItem>
                      </Select>
                    </FormControl>
                    {dateFilterType === "custom" && (
                      <Button
                        variant="outlined"
                        onClick={() => setDatePickerOpen(true)}
                        sx={{
                          height: 40,
                          color: darkMode ? "white" : "black",
                          borderColor: darkMode ? "white" : "black",
                        }}
                      >
                        Choose Dates
                      </Button>
                    )}
                  </Box>
                </MDBox>

                <Dialog
                  open={datePickerOpen}
                  onClose={() => setDatePickerOpen(false)}
                  sx={{
                    "& .MuiDialog-paper": {
                      backgroundColor: darkMode ? "background.default" : "background.paper",
                    },
                  }}
                >
                  <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                    Select Date Range
                  </DialogTitle>
                  <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                      label="Start Date"
                      type="date"
                      value={customStartDate ? customStartDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => setCustomStartDate(new Date(e.target.value))}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                    <TextField
                      label="End Date"
                      type="date"
                      value={customEndDate ? customEndDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => setCustomEndDate(new Date(e.target.value))}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </DialogContent>
                  <DialogActions>
                    <Button
                      onClick={() => setDatePickerOpen(false)}
                      sx={{ color: darkMode ? "white" : "black" }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => setDatePickerOpen(false)} color="primary">
                      Apply
                    </Button>
                  </DialogActions>
                </Dialog>

                <Grid container spacing={3} sx={{ padding: "16px" }}>
                  {filteredCustomers.map((customer) => (
                    <Grid item xs={12} key={customer.id}>
                      <Card
                        sx={{
                          background: darkMode
                            ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                            : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                          borderRadius: "12px",
                          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                          padding: "20px",
                          transition: "0.3s ease-in-out",
                          "&:hover": {
                            boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                            transform: "scale(1.02)",
                          },
                          display: "flex",
                        }}
                      >
                        <Box
                          sx={{
                            width: "120px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:
                              customer.subscriptionTier === "premium"
                                ? darkMode
                                  ? "#4caf50"
                                  : "#4caf50"
                                : darkMode
                                ? "#90A4AE"
                                : "#B0BEC5",
                            borderRadius: "8px 0 0 8px",
                            marginRight: "16px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          }}
                        >
                          <MDTypography
                            variant="body2"
                            color={darkMode ? "white" : "white"}
                            sx={{ fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}
                          >
                            {customer.subscriptionTier === "premium" ? "Premium" : "Free"}
                          </MDTypography>
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <CardContent>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Customer ID: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.customerId}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Name: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.customerName}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Email: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.email}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Phone: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.phone || "N/A"}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Address: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.address || "N/A"}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Status: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.status}</span>
                                </MDTypography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Subscription Tier: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.subscriptionTier}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Feature: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.feature || "N/A"}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Project IDs: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.projectIds?.join(", ") || "None"}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>Sign-Up Date: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.signUpDate?.toLocaleDateString() || "N/A"}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                  sx={{ mb: 1 }}
                                >
                                  <span>CLTV: </span>
                                  <span style={{ fontWeight: "bold" }}>{customer.cltv}</span>
                                </MDTypography>
                                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                                  <MDButton
                                    variant="outlined"
                                    color={darkMode ? "white" : "info"}
                                    size="small"
                                    onClick={() => handleNpsUpdateOpen(customer)}
                                  >
                                    <Icon fontSize="small">update</Icon>
                                    NPS: {latestMetrics[customer.customerId]?.nps?.value ?? "N/A"} 
                                    {latestMetrics[customer.customerId]?.nps?.date 
                                      ? ` (${latestMetrics[customer.customerId].nps.date.toLocaleDateString()})`
                                      : ""}
                                  </MDButton>
                                  <MDButton
                                    variant="outlined"
                                    color={darkMode ? "white" : "info"}
                                    size="small"
                                    onClick={() => handleCsatUpdateOpen(customer)}
                                  >
                                    <Icon fontSize="small">update</Icon>
                                    CSAT: {latestMetrics[customer.customerId]?.csat?.value ?? "N/A"} 
                                    {latestMetrics[customer.customerId]?.csat?.date 
                                      ? ` (${latestMetrics[customer.customerId].csat.date.toLocaleDateString()})`
                                      : ""}
                                  </MDButton>
                                  <MDButton
                                    variant="outlined"
                                    color={darkMode ? "white" : "info"}
                                    size="small"
                                    onClick={() => handleChsUpdateOpen(customer)}
                                  >
                                    <Icon fontSize="small">update</Icon>
                                    CHS: {latestMetrics[customer.customerId]?.chs?.value ?? "N/A"} 
                                    {latestMetrics[customer.customerId]?.chs?.date 
                                      ? ` (${latestMetrics[customer.customerId].chs.date.toLocaleDateString()})`
                                      : ""}
                                  </MDButton>
                                </Box>
                              </Grid>
                            </Grid>
                          </CardContent>
                          {!isReadOnly && (
                            <CardActions sx={{ display: "flex", justifyContent: "flex-end" }}>
                              <MDButton
                                variant="gradient"
                                color={darkMode ? "dark" : "info"}
                                onClick={() => handleEdit(customer)}
                              >
                                <Icon fontSize="medium">edit</Icon> Edit
                              </MDButton>
                              <MDButton
                                variant="gradient"
                                color={darkMode ? "dark" : "success"}
                                onClick={() => handleSupportOpen(customer)}
                              >
                                <Icon fontSize="medium">support</Icon> Support
                              </MDButton>
                              {customer.subscriptionTier === "free" && (
                                <MDButton
                                  variant="gradient"
                                  color={darkMode ? "dark" : "warning"}
                                  onClick={() => handleUpgradeOpen(customer)}
                                >
                                  <Icon fontSize="medium">upgrade</Icon> Upgrade
                                </MDButton>
                              )}
                              <MDButton
                                variant="gradient"
                                color="error"
                                onClick={() => handleCancelOpen(customer)}
                              >
                                <Icon fontSize="medium">cancel</Icon> Cancel
                              </MDButton>
                            </CardActions>
                          )}
                        </Box>
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
            marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
            backgroundColor: darkMode ? "background.default" : "background.paper",
            zIndex: 1100,
          }}
        >
          <Footer />
        </Box>

        {!isReadOnly && (
          <>
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
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Customer Name"
                      placeholder="Enter Customer Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="email"
                      label="Email"
                      placeholder="Enter Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="tel"
                      label="Phone"
                      placeholder="Enter Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Address"
                      placeholder="Enter Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>Status</InputLabel>
                      <Select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        label="Status"
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          backgroundColor: darkMode ? "#424242" : "#fff",
                        }}
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                        Subscription Tier
                      </InputLabel>
                      <Select
                        value={subscriptionTier}
                        onChange={(e) => setSubscriptionTier(e.target.value)}
                        label="Subscription Tier"
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          backgroundColor: darkMode ? "#424242" : "#fff",
                        }}
                      >
                        <MenuItem value="free">Free</MenuItem>
                        <MenuItem value="premium">Premium</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                        Feature
                      </InputLabel>
                      <Select
                        value={feature}
                        onChange={(e) => setFeature(e.target.value)}
                        label="Feature"
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          backgroundColor: darkMode ? "#424242" : "#fff",
                        }}
                      >
                        {featureOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                        Project IDs
                      </InputLabel>
                      <Select
                        multiple
                        value={projectIds}
                        onChange={(e) => setProjectIds(e.target.value)}
                        label="Project IDs"
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip
                                key={value}
                                label={value}
                                sx={{
                                  backgroundColor: darkMode ? "#616161" : "#e0e0e0",
                                  color: darkMode ? "white" : "black",
                                }}
                              />
                            ))}
                          </Box>
                        )}
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          backgroundColor: darkMode ? "#424242" : "#fff",
                        }}
                      >
                        {projects.map((project) => (
                          <MenuItem key={project.projectId} value={project.projectId}>
                            {project.projectId} - {project.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Sign-Up Date"
                      value={signUpDate ? signUpDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => setSignUpDate(e.target.value ? new Date(e.target.value) : null)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Net Promoter Score (0-100)"
                      placeholder="Enter NPS (0-100)"
                      value={nps}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value >= 0 && value <= 100) setNps(e.target.value);
                      }}
                      inputProps={{ min: 0, max: 100 }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="NPS Date"
                      value={npsDate ? npsDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => setNpsDate(e.target.value ? new Date(e.target.value) : null)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Customer Satisfaction Score (0-100)"
                      placeholder="Enter CSAT (0-100)"
                      value={csat}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value >= 0 && value <= 100) setCsat(e.target.value);
                      }}
                      inputProps={{ min: 0, max: 100 }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="CSAT Date"
                      value={csatDate ? csatDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => setCsatDate(e.target.value ? new Date(e.target.value) : null)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Customer Health Score"
                      placeholder="Enter CHS"
                      value={chs}
                      onChange={(e) => setChs(e.target.value)}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="CHS Date"
                      value={chsDate ? chsDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => setChsDate(e.target.value ? new Date(e.target.value) : null)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Customer Lifetime Value"
                      placeholder="Enter CLTV"
                      value={cltv}
                      onChange={(e) => setCltv(e.target.value)}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose} sx={{ color: darkMode ? "white" : "black" }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} color="primary">
                  Save
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={supportOpen}
              onClose={handleSupportClose}
              maxWidth="md"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                Create Support Ticket for {supportCustomer?.customerName || "Customer"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Project IDs"
                      value={supportProjectIds.join(", ") || "None"}
                      InputProps={{ readOnly: true }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Issue Description"
                      placeholder="Describe the issue"
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Number of Issues"
                      placeholder="Enter Number of Issues"
                      value={numberOfIssues}
                      onChange={(e) => setNumberOfIssues(e.target.value)}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      label="Complaint Date"
                      value={
                        complaintDate
                          ? complaintDate.toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setComplaintDate(e.target.value ? new Date(e.target.value) : null)
                      }
                      InputLabelProps={{ shrink: true }}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      label="Resolved Date"
                      value={
                        resolvedDate
                          ? resolvedDate.toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setResolvedDate(e.target.value ? new Date(e.target.value) : null)
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                        Response Channel
                      </InputLabel>
                      <Select
                        multiple
                        value={responseChannel}
                        onChange={(e) => setResponseChannel(e.target.value)}
                        label="Response Channel"
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip
                                key={value}
                                label={value}
                                sx={{
                                  backgroundColor: darkMode ? "#616161" : "#e0e0e0",
                                  color: darkMode ? "white" : "black",
                                }}
                              />
                            ))}
                          </Box>
                        )}
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          backgroundColor: darkMode ? "#424242" : "#fff",
                        }}
                      >
                        {responseChannelOptions.map((channel) => (
                          <MenuItem key={channel} value={channel}>
                            {channel}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleSupportClose} sx={{ color: darkMode ? "white" : "black" }}>
                  Cancel
                </Button>
                <Button onClick={handleSupportSubmit} color="primary">
                  Save
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={upgradeOpen}
              onClose={handleUpgradeClose}
              maxWidth="sm"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                Upgrade Subscription for {upgradeCustomer?.customerName || "Customer"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth required>
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                        Subscription Tier
                      </InputLabel>
                      <Select
                        value={upgradeSubscriptionTier}
                        onChange={(e) => setUpgradeSubscriptionTier(e.target.value)}
                        label="Subscription Tier"
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          backgroundColor: darkMode ? "#424242" : "#fff",
                        }}
                      >
                        <MenuItem value="premium">Premium</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Plan Upgrade Date"
                      value={
                        planUpgradeDate ? planUpgradeDate.toISOString().split("T")[0] : ""
                      }
                      onChange={(e) =>
                        setPlanUpgradeDate(e.target.value ? new Date(e.target.value) : null)
                      }
                      InputLabelProps={{ shrink: true }}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Project IDs"
                      value={upgradeCustomer?.projectIds.join(", ") || "None"}
                      InputProps={{ readOnly: true }}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleUpgradeClose} sx={{ color: darkMode ? "white" : "black" }}>
                  Cancel
                </Button>
                <Button onClick={handleUpgradeSubmit} color="primary">
                  Upgrade
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={cancelOpen}
              onClose={handleCancelClose}
              maxWidth="sm"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                Cancel Subscription for {cancelCustomer?.customerName || "Customer"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Cancellation Date"
                      value={
                        cancellationDate ? cancellationDate.toISOString().split("T")[0] : ""
                      }
                      onChange={(e) =>
                        setCancellationDate(e.target.value ? new Date(e.target.value) : null)
                      }
                      InputLabelProps={{ shrink: true }}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth required>
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                        Churn Reason
                      </InputLabel>
                      <Select
                        value={churnReason}
                        onChange={(e) => setChurnReason(e.target.value)}
                        label="Churn Reason"
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          backgroundColor: darkMode ? "#424242" : "#fff",
                        }}
                      >
                        {churnReasonOptions.map((reason) => (
                          <MenuItem key={reason} value={reason}>
                            {reason}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCancelClose} sx={{ color: darkMode ? "white" : "black" }}>
                  Cancel
                </Button>
                <Button onClick={handleCancelSubmit} color="error">
                  Confirm Cancellation
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={npsUpdateOpen}
              onClose={handleNpsUpdateClose}
              maxWidth="sm"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                Update NPS for {updateMetricCustomer?.customerName || "Customer"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Net Promoter Score (0-100)"
                      placeholder="Enter NPS (0-100)"
                      value={nps}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value >= 0 && value <= 100) setNps(e.target.value);
                      }}
                      inputProps={{ min: 0, max: 100 }}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="date"
                      label="NPS Date"
                      value={npsDate ? npsDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => setNpsDate(e.target.value ? new Date(e.target.value) : null)}
                      InputLabelProps={{ shrink: true }}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleNpsUpdateClose} sx={{ color: darkMode ? "white" : "black" }}>
                  Cancel
                </Button>
                <Button onClick={handleNpsUpdateSubmit} color="primary">
                  Update
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={csatUpdateOpen}
              onClose={handleCsatUpdateClose}
              maxWidth="sm"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                Update CSAT for {updateMetricCustomer?.customerName || "Customer"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Customer Satisfaction Score (0-100)"
                      placeholder="Enter CSAT (0-100)"
                      value={csat}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value >= 0 && value <= 100) setCsat(e.target.value);
                      }}
                      inputProps={{ min: 0, max: 100 }}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="date"
                      label="CSAT Date"
                      value={csatDate ? csatDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => setCsatDate(e.target.value ? new Date(e.target.value) : null)}
                      InputLabelProps={{ shrink: true }}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCsatUpdateClose} sx={{ color: darkMode ? "white" : "black" }}>
                  Cancel
                </Button>
                <Button onClick={handleCsatUpdateSubmit} color="primary">
                  Update
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={chsUpdateOpen}
              onClose={handleChsUpdateClose}
              maxWidth="sm"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                Update CHS for {updateMetricCustomer?.customerName || "Customer"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Customer Health Score"
                      placeholder="Enter CHS"
                      value={chs}
                      onChange={(e) => setChs(e.target.value)}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="date"
                      label="CHS Date"
                      value={chsDate ? chsDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => setChsDate(e.target.value ? new Date(e.target.value) : null)}
                      InputLabelProps={{ shrink: true }}
                      required
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleChsUpdateClose} sx={{ color: darkMode ? "white" : "black" }}>
                  Cancel
                </Button>
                <Button onClick={handleChsUpdateSubmit} color="primary">
                  Update
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default ManageCustomer;