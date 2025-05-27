import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  CircularProgress,
  Typography,
  styled,
  Select,
  InputLabel,
  FormControl,
  useTheme,
} from "@mui/material";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import PieChart from "examples/Charts/PieChart";
import DataTable from "examples/Tables/DataTable";
import {
  fetchExpenses,
  fetchEarnings,
} from "../../utils/fetchData";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SettingsIcon from "@mui/icons-material/Settings";
import CloseIcon from "@mui/icons-material/Close";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Styled CustomCheckbox
const StyledCheckbox = styled(FormControlLabel)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
  userSelect: "none",
  fontSize: "16px",
  color: theme.palette.text.primary,
  transition: "color 0.3s ease",
  margin: 0,
  "& .MuiCheckbox-root": {
    display: "none",
  },
  "& .MuiFormControlLabel-label": {
    position: "relative",
    width: "24px",
    height: "24px",
  },
  "& .MuiCheckbox-root + .MuiFormControlLabel-label::before": {
    content: '""',
    width: "24px",
    height: "24px",
    border: `2px solid ${theme.palette.text.primary}`,
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.3s ease, border-color 0.3s ease, transform 0.3s ease",
    transformStyle: "preserve-3d",
  },
  "& .MuiCheckbox-root + .MuiFormControlLabel-label::after": {
    content: '"✓"',
    fontSize: "16px",
    color: "transparent",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    transition: "color 0.3s ease",
  },
  "& .MuiCheckbox-root:checked + .MuiFormControlLabel-label::before": {
    backgroundColor: theme.palette.text.primary,
    borderColor: theme.palette.text.primary,
    transform: "scale(1.1) rotateZ(360deg) rotateY(360deg)",
  },
  "& .MuiCheckbox-root:checked + .MuiFormControlLabel-label::after": {
    color: theme.palette.common.white,
  },
  "&:hover": {
    color: theme.palette.grey[600],
    "& .MuiCheckbox-root + .MuiFormControlLabel-label::before": {
      borderColor: theme.palette.grey[600],
      backgroundColor: theme.palette.grey[100],
      transform: "scale(1.05)",
    },
  },
  "& .MuiCheckbox-root:focus + .MuiFormControlLabel-label::before": {
    boxShadow: `0 0 3px 2px ${theme.palette.action.focusOpacity}`,
    outline: "none",
  },
  "& .MuiCheckbox-root + .MuiFormControlLabel-label::before, & .MuiCheckbox-root:checked + .MuiFormControlLabel-label::before": {
    transition: "background-color 0.3s ease, border-color 0.3s ease, transform 0.3s ease",
  },
}));

// Custom Checkbox Component
const CustomCheckbox = React.memo(({ checked, onChange, label }) => (
  <StyledCheckbox
    control={
      <Checkbox
        checked={checked}
        onChange={onChange}
        color="primary"
        inputProps={{ "aria-label": label }}
      />
    }
    label=""
  />
));

CustomCheckbox.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
};

// PropTypes for row.original in tableColumns
const rowOriginalPropTypes = PropTypes.shape({
  isSelected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  category: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onCategoryClick: PropTypes.func.isRequired,
});

// Table columns
const tableColumns = [
  {
    Header: "Select",
    accessor: "select",
    Cell: ({ row }) => (
      <MDBox display="flex" justifyContent="center">
        <CustomCheckbox
          checked={row.original.isSelected}
          onChange={() => row.original.onToggle(row.original.category)}
          label={`Select ${row.original.category}`}
        />
      </MDBox>
    ),
  },
  { Header: "Category", accessor: "category" },
  { Header: "Amount", accessor: "amount" },
  {
    Header: "Description",
    accessor: "description",
    Cell: ({ row }) => (
      <IconButton
        aria-label={`Expand ${row.original.category} details`}
        size="small"
        onClick={() => row.original.onCategoryClick(row.original.category)}
      >
        {row.original.isOpen ? (
          <KeyboardArrowUpIcon />
        ) : (
          <KeyboardArrowDownIcon />
        )}
      </IconButton>
    ),
  },
];

// PropTypes for Cell render functions
tableColumns[0].Cell.propTypes = {
  row: PropTypes.shape({
    original: rowOriginalPropTypes,
  }).isRequired,
};

tableColumns[3].Cell.propTypes = {
  row: PropTypes.shape({
    original: rowOriginalPropTypes,
  }).isRequired,
};

const detailsColumns = [
  { Header: "Type", accessor: "type" },
  { Header: "Category", accessor: "category" },
  { Header: "Date", accessor: "date" },
  { Header: "Amount", accessor: "amount" },
  { Header: "Account ID", accessor: "accountId" },
  { Header: "Description", accessor: "description" },
];

// Styled Modern Dropdown
const ModernSelect = styled(Select)(({ theme }) => ({
  width: "100%",
  height: "44px",
  backgroundColor: theme.palette.mode === "dark" ? "#2a2a2a" : "#ffffff",
  borderRadius: "8px",
  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"}`,
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
  transition: "all 0.3s ease",
  "& .MuiSelect-select": {
    padding: "10px 40px 10px 14px",
    fontSize: "0.875rem",
    color: theme.palette.text.primary,
    "&:focus": {
      backgroundColor: "transparent",
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    border: "none",
  },
  "&:hover": {
    borderColor: theme.palette.primary.main,
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    transform: "scale(1.01)",
  },
  "&.Mui-focused": {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${theme.palette.primary.light}33`,
  },
  "& .MuiSelect-icon": {
    transition: "transform 0.3s ease",
    right: "12px",
    color: theme.palette.text.secondary,
  },
  "&.Mui-focused .MuiSelect-icon": {
    transform: "rotate(180deg)",
  },
  [theme.breakpoints.down("md")]: {
    width: "100%",
    maxWidth: "100%",
  },
}));

const ModernFormControl = styled(FormControl)(({ theme }) => ({
  width: { xs: "100%", md: "220px" },
  "& .MuiInputLabel-root": {
    fontSize: "0.875rem",
    color: theme.palette.text.secondary,
    transform: "translate(14px, 12px) scale(1)",
    "&.Mui-focused, &.MuiFormLabel-filled": {
      transform: "translate(14px, -9px) scale(0.75)",
      color: theme.palette.primary.main,
    },
  },
}));

// Custom MenuProps for dropdown
const menuProps = {
  PaperProps: {
    style: {
      maxHeight: 300,
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      marginTop: "4px",
      backgroundColor: (theme) => (theme.palette.mode === "dark" ? "#2a2a2a" : "#ffffff"),
    },
  },
  anchorOrigin: {
    vertical: "bottom",
    horizontal: "left",
  },
  transformOrigin: {
    vertical: "top",
    horizontal: "left",
  },
};

function Dashboard() {
  const theme = useTheme();
  const [data, setData] = useState({
    expenses: [],
    earnings: [],
    isLoading: true,
    error: null,
  });
  const [selectedChartData, setSelectedChartData] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [activeCard, setActiveCard] = useState("expenses");
  const [dashboardLevel, setDashboardLevel] = useState("Organization Level");
  const [accountId, setAccountId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [accountAnchorEl, setAccountAnchorEl] = useState(null);
  const [runwayAnchorEl, setRunwayAnchorEl] = useState(null);
  const [dateFilterAnchorEl, setDateFilterAnchorEl] = useState(null);
  const [selectedRunwayMonths, setSelectedRunwayMonths] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedDetailCategories, setSelectedDetailCategories] = useState({});

  // Menu handlers
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleAccountMenuOpen = (event) =>
    setAccountAnchorEl(event.currentTarget);
  const handleAccountMenuClose = () => setAccountAnchorEl(null);
  const handleRunwaySettingsOpen = (event) =>
    setRunwayAnchorEl(event.currentTarget);
  const handleRunwaySettingsClose = () => setRunwayAnchorEl(null);
  const handleDateFilterOpen = (event) =>
    setDateFilterAnchorEl(event.currentTarget);
  const handleDateFilterClose = () => setDateFilterAnchorEl(null);

  // Debounced filter application
  const debouncedApplyDateFilter = useCallback(
    debounce(() => {
      if (!startDate || !endDate) {
        toast.error("Please select both start and end dates");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error("Start date cannot be after end date");
        return;
      }
      handleDateFilterClose();
    }, 300),
    [startDate, endDate]
  );

  const handleDashboardLevelChange = (level) => {
    setDashboardLevel(level);
    setAccountId(null);
    handleMenuClose();
  };

  const handleAccountIdChange = (id) => {
    setAccountId(id);
    handleAccountMenuClose();
  };

  const handleRunwayMonthToggle = (yearMonth) => {
    setSelectedRunwayMonths((prev) => ({
      ...prev,
      [yearMonth]: !prev[yearMonth],
    }));
  };

  const handleSelectAllMonths = () => {
    setSelectedRunwayMonths({});
  };

  const handleResetDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    handleDateFilterClose();
  };

  const handleDetailCategoryToggle = (category) => {
    setSelectedDetailCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Data fetching
  useEffect(() => {
    const loadData = async () => {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const [expensesData, earningsData] = await Promise.all([
          fetchExpenses(),
          fetchEarnings(),
        ]);

        // Validate and normalize data
        const validatedExpenses = expensesData.map((expense) => ({
          ...expense,
          date: new Date(expense.date),
          amount: Number(expense.amount) || 0,
          category: expense.category || "Uncategorized",
          accountId: expense.accountId || null,
          description: expense.description || "No description",
        }));
        const validatedEarnings = earningsData.map((earning) => ({
          ...earning,
          date: new Date(earning.date),
          amount: Number(earning.amount) || 0,
          category: earning.category || "Uncategorized",
          accountId: earning.accountId || null,
          description: earning.description || "No description",
        }));

        setData({
          expenses: validatedExpenses,
          earnings: validatedEarnings,
          isLoading: false,
          error: null,
        });

        // Set initial chart data
        const expensesByCat = validatedExpenses.reduce((acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        }, {});
        setSelectedChartData(expensesByCat);
      } catch (error) {
        console.error("Error loading data:", error);
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
        toast.error("Failed to load financial data");
      }
    };
    loadData();
  }, []);

  // Filtered data
  const filteredExpenses = useMemo(() => {
    let result = data.expenses;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      result = result.filter((expense) => {
        const expenseDate = expense.date;
        return expenseDate >= start && expenseDate <= end;
      });
    }
    if (accountId) {
      result = result.filter((expense) => expense.accountId === accountId);
    }
    return result;
  }, [data.expenses, startDate, endDate, accountId]);

  const filteredEarnings = useMemo(() => {
    let result = data.earnings;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      result = result.filter((earning) => {
        const earningDate = earning.date;
        return earningDate >= start && earningDate <= end;
      });
    }
    if (accountId) {
      result = result.filter((earning) => earning.accountId === accountId);
    }
    return result;
  }, [data.earnings, startDate, endDate, accountId]);

  const runwayExpenses = useMemo(() => {
    if (Object.keys(selectedRunwayMonths).length === 0) return data.expenses;
    const selectedFilters = Object.entries(selectedRunwayMonths)
      .filter(([_, isSelected]) => isSelected)
      .map(([yearMonth]) => {
        const [year, month] = yearMonth.split("-");
        return { year: parseInt(year), month: parseInt(month) };
      });
    return data.expenses.filter((expense) => {
      const date = expense.date;
      return selectedFilters.some(
        (filter) =>
          date.getFullYear() === filter.year && date.getMonth() === filter.month
      );
    });
  }, [data.expenses, selectedRunwayMonths]);

  const runwayEarnings = useMemo(() => {
    if (Object.keys(selectedRunwayMonths).length === 0) return data.earnings;
    const selectedFilters = Object.entries(selectedRunwayMonths)
      .filter(([_, isSelected]) => isSelected)
      .map(([yearMonth]) => {
        const [year, month] = yearMonth.split("-");
        return { year: parseInt(year), month: parseInt(month) };
      });
    return data.earnings.filter((earning) => {
      const date = earning.date;
      return selectedFilters.some(
        (filter) =>
          date.getFullYear() === filter.year && date.getMonth() === filter.month
      );
    });
  }, [data.earnings, selectedRunwayMonths]);

  // Chart data
  const expensesPieChartData = useMemo(
    () =>
      Object.entries(
        filteredExpenses.reduce((acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        }, {})
      ).map(([category, amount]) => ({ value: amount, name: category })),
    [filteredExpenses]
  );

  const earningsPieChartData = useMemo(
    () =>
      Object.entries(
        filteredEarnings.reduce((acc, earning) => {
          acc[earning.category] = (acc[earning.category] || 0) + earning.amount;
          return acc;
        }, {})
      ).map(([category, amount]) => ({ value: amount, name: category })),
    [filteredEarnings]
  );

  const totalExpenses = useMemo(
    () => expensesPieChartData.reduce((acc, { value }) => acc + value, 0),
    [expensesPieChartData]
  );
  const totalEarnings = useMemo(
    () => earningsPieChartData.reduce((acc, { value }) => acc + value, 0),
    [earningsPieChartData]
  );
  const profitLoss = totalEarnings - totalExpenses;

  const runwayTotalExpenses = useMemo(
    () => runwayExpenses.reduce((acc, expense) => acc + expense.amount, 0),
    [runwayExpenses]
  );
  const runwayTotalEarnings = useMemo(
    () => runwayEarnings.reduce((acc, earning) => acc + earning.amount, 0),
    [runwayEarnings]
  );
  const runwayProfitLoss = runwayTotalEarnings - runwayTotalExpenses;
  const runwayMonthCount =
    Object.values(selectedRunwayMonths).filter(Boolean).length || 12;
  const runwayAvgMonthlyExpense = runwayTotalExpenses / runwayMonthCount || 1;
  const financialRunway = Number.isFinite(
    runwayProfitLoss / runwayAvgMonthlyExpense
  )
    ? Math.round(runwayProfitLoss / runwayAvgMonthlyExpense)
    : 0;

  // Grouped Bar Chart for Expenses vs Earnings
  const expensesEarningsBarChartData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return {
      labels: months,
      datasets: [
        {
          label: "Expenses",
          data: months.map(
            (_, i) =>
              filteredExpenses
                .filter(
                  (e) => e.date.getMonth() === i && e.date.getFullYear() === new Date().getFullYear()
                )
                .reduce((sum, e) => sum + e.amount, 0)
          ),
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
        {
          label: "Earnings",
          data: months.map(
            (_, i) =>
              filteredEarnings
                .filter(
                  (e) => e.date.getMonth() === i && e.date.getFullYear() === new Date().getFullYear()
                )
                .reduce((sum, e) => sum + e.amount, 0)
          ),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [filteredExpenses, filteredEarnings]);

  // Stacked Bar Chart for Financial Runway
  const financialRunwayBarChartData = useMemo(() => ({
    labels: ["Financial Runway"],
    datasets: [
      {
        label: "Runway Months",
        data: [financialRunway],
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        stack: "Stack 0",
      },
    ],
  }), [financialRunway]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: theme.palette.mode === "dark" ? "#ffffff" : "#333333",
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: theme.palette.mode === "dark" ? "rgba(50, 50, 50, 0.9)" : "rgba(255, 255, 255, 0.9)",
        titleColor: theme.palette.mode === "dark" ? "#ffffff" : "#333333",
        bodyColor: theme.palette.mode === "dark" ? "#ffffff" : "#333333",
        borderColor: theme.palette.mode === "dark" ? "#555555" : "#cccccc",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: theme.palette.mode === "dark" ? "#ffffff" : "#333333" },
        grid: { display: false },
      },
      y: {
        ticks: { color: theme.palette.mode === "dark" ? "#ffffff" : "#333333" },
        grid: { color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" },
        beginAtZero: true,
        title: {
          display: true,
          text: "Amount ($)",
          color: theme.palette.mode === "dark" ? "#ffffff" : "#333333",
        },
      },
    },
  };

  const runwayChartOptions = {
    ...chartOptions,
    scales: {
      x: {
        ticks: { color: theme.palette.mode === "dark" ? "#ffffff" : "#333333" },
        grid: { display: false },
      },
      y: {
        ticks: { color: theme.palette.mode === "dark" ? "#ffffff" : "#333333" },
        grid: { color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" },
        beginAtZero: true,
        min: Math.min(financialRunway, 0) - 5,
        max: Math.max(financialRunway, 0) + 5,
        title: {
          display: true,
          text: "Months",
          color: theme.palette.mode === "dark" ? "#ffffff" : "#333333",
        },
      },
    },
  };

  const handleChartClick = useCallback((chartData, cardId) => {
    setSelectedChartData(chartData);
    setActiveCard(cardId);
    setSelectedDetailCategories({});
    setOpenCategory(null);
  }, []);

  const handleCategoryClick = useCallback((category) => {
    setOpenCategory((prev) => (prev === category ? null : category));
  }, []);

  const getCategoryDetails = useCallback(
    (category, type) => {
      const data = type === "expense" ? filteredExpenses : filteredEarnings;
      return data
        .filter((item) => item.category === category)
        .map((item) => {
          try {
            return {
              type: type === "expense" ? "Expense" : "Earning",
              category: item.category,
              date: item.date.toLocaleDateString(),
              amount: item.amount,
              accountId: item.accountId || "N/A",
              description: item.description,
            };
          } catch (error) {
            console.error(`Error processing ${type} item:`, item, error);
            return null;
          }
        })
        .filter(Boolean);
    },
    [filteredExpenses, filteredEarnings]
  );

  const tableRows = useMemo(() => {
    if (!selectedChartData) return [];
    return Object.entries(selectedChartData)
      .filter(([category]) =>
        activeCard === "expenses"
          ? expensesPieChartData.some((item) => item.name === category)
          : earningsPieChartData.some((item) => item.name === category)
      )
      .map(([category, amount]) => ({
        category,
        amount,
        isSelected: !!selectedDetailCategories[category],
        onToggle: handleDetailCategoryToggle,
        isOpen: openCategory === category,
        onCategoryClick: handleCategoryClick,
      }));
  }, [
    selectedChartData,
    activeCard,
    expensesPieChartData,
    earningsPieChartData,
    selectedDetailCategories,
    openCategory,
    handleDetailCategoryToggle,
    handleCategoryClick,
  ]);

  const accountIds = useMemo(
    () =>
      [
        ...new Set(
          [...data.expenses, ...data.earnings].map((item) => item.accountId)
        ),
      ].filter(Boolean),
    [data.expenses, data.earnings]
  );

  const availableYears = useMemo(() => {
    const allDates = [...data.expenses, ...data.earnings].map((item) =>
      item.date.getFullYear()
    );
    return [...new Set(allDates)].sort();
  }, [data.expenses, data.earnings]);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (data.isLoading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={8} mt={8} display="flex" justifyContent="center">
          <CircularProgress />
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  if (data.error) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={8} mt={8} display="flex" justifyContent="center">
          <Typography color="error">
            Error loading data: {data.error}
          </Typography>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={8} mt={8}>
        <MDBox
          mb={4}
          display="flex"
          justifyContent="flex-start"
          gap={2}
          alignItems="center"
          flexDirection={{ xs: "column", md: "row" }}
        >
          <MDBox
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              width: { xs: "100%", md: "300px" },
              borderRadius: "0.5rem",
              backgroundColor: theme.palette.mode === "dark" ? "#333333" : "#eeeeee",
              boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.06)",
              padding: "0.25rem",
              fontSize: "14px",
            }}
          >
            <MDBox sx={{ flex: { xs: "0 0 auto", md: "1 1 auto" }, textAlign: "center" }}>
              <input
                type="radio"
                name="dashboardLevel"
                value="Organization Level"
                checked={dashboardLevel === "Organization Level"}
                onChange={() => handleDashboardLevelChange("Organization Level")}
                style={{ display: "none" }}
                id="orgLevel"
              />
              <Typography
                component="label"
                htmlFor="orgLevel"
                sx={{
                  display: "flex",
                  cursor: "pointer",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "0.5rem",
                  padding: "0.5rem",
                  color: theme.palette.mode === "dark" ? "#ffffff" : "rgba(51, 65, 85, 1)",
                  transition: "all 0.15s ease-in-out",
                  backgroundColor: dashboardLevel === "Organization Level"
                    ? (theme.palette.mode === "dark" ? "#444444" : "#ffffff")
                    : "transparent",
                  fontWeight: dashboardLevel === "Organization Level" ? 600 : 400,
                  width: "100%",
                  "&:hover": {
                    backgroundColor: theme.palette.mode === "dark" ? "#555555" : "#dddddd",
                  },
                }}
              >
                Organization Level
              </Typography>
            </MDBox>
            <MDBox sx={{ flex: { xs: "0 0 auto", md: "1 1 auto" }, textAlign: "center" }}>
              <input
                type="radio"
                name="dashboardLevel"
                value="Account Level"
                checked={dashboardLevel === "Account Level"}
                onChange={() => handleDashboardLevelChange("Account Level")}
                style={{ display: "none" }}
                id="accountLevel"
              />
              <Typography
                component="label"
                htmlFor="accountLevel"
                sx={{
                  display: "flex",
                  cursor: "pointer",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "0.5rem",
                  padding: "0.5rem",
                  color: theme.palette.mode === "dark" ? "#ffffff" : "rgba(51, 65, 85, 1)",
                  transition: "all 0.15s ease-in-out",
                  backgroundColor: dashboardLevel === "Account Level"
                    ? (theme.palette.mode === "dark" ? "#444444" : "#ffffff")
                    : "transparent",
                  fontWeight: dashboardLevel === "Account Level" ? 600 : 400,
                  width: "100%",
                  "&:hover": {
                    backgroundColor: theme.palette.mode === "dark" ? "#555555" : "#dddddd",
                  },
                }}
              >
                Account Level
              </Typography>
            </MDBox>
          </MDBox>

          {dashboardLevel === "Account Level" && (
            <ModernFormControl variant="outlined">
              <InputLabel id="account-id-label"></InputLabel>
              <ModernSelect
                labelId="account-id-label"
                value={accountId || ""}
                onChange={(e) => handleAccountIdChange(e.target.value)}
                label="Select Account ID"
                MenuProps={{
                  ...menuProps,
                  PaperProps: {
                    ...menuProps.PaperProps,
                    style: {
                      ...menuProps.PaperProps.style,
                      backgroundColor: theme.palette.mode === "dark" ? "#2a2a2a" : "#ffffff",
                    },
                  },
                }}
                displayEmpty
                renderValue={(selected) => selected || <em>Select Account ID</em>}
              >
                <MenuItem value="">
                  <em>Select Account ID</em>
                </MenuItem>
                {accountIds.map((id) => (
                  <MenuItem key={id} value={id}>
                    {id}
                  </MenuItem>
                ))}
              </ModernSelect>
            </ModernFormControl>
          )}

          <IconButton
            size="small"
            onClick={handleDateFilterOpen}
            sx={{
              bgcolor: theme.palette.mode === "dark" ? "#2a2a2a" : "#ffffff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              "&:hover": { bgcolor: theme.palette.mode === "dark" ? "#3a3a3a" : "#f5f5f5" },
            }}
          >
            <SettingsIcon />
          </IconButton>
          <Menu
            id="date-filter-menu"
            anchorEl={dateFilterAnchorEl}
            open={Boolean(dateFilterAnchorEl)}
            onClose={handleDateFilterClose}
            PaperProps={{
              sx: {
                mt: 1,
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                minWidth: { xs: "280px", md: "400px" },
                p: 2,
                bgcolor: theme.palette.mode === "dark" ? "#2a2a2a" : "#ffffff",
              },
            }}
          >
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="medium" color={theme.palette.mode === "dark" ? "white" : "text.primary"}>
                Date Filter
              </Typography>
              <IconButton size="small" onClick={handleDateFilterClose}>
                <CloseIcon />
              </IconButton>
            </MDBox>
            <MDBox
              display="grid"
              gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}
              gap={2}
              mb={2}
            >
              <TextField
                label="Start Date"
                type="date"
                value={startDate || ""}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "6px",
                    "& fieldset": { borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" },
                    "&:hover fieldset": { borderColor: "#1976d2" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2" },
                    bgcolor: theme.palette.mode === "dark" ? "#333333" : "#ffffff",
                    color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.palette.mode === "dark" ? "#cccccc" : "#666666",
                    "&.Mui-focused": { color: "#1976d2" },
                  },
                }}
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate || ""}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "6px",
                    "& fieldset": { borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" },
                    "&:hover fieldset": { borderColor: "#1976d2" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2" },
                    bgcolor: theme.palette.mode === "dark" ? "#333333" : "#ffffff",
                    color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.palette.mode === "dark" ? "#cccccc" : "#666666",
                    "&.Mui-focused": { color: "#1976d2" },
                  },
                }}
              />
            </MDBox>
            <MDBox display="flex" gap={1} justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={debouncedApplyDateFilter}
                sx={{
                  bgcolor: "linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)",
                  color: "#ffffff",
                  borderRadius: "6px",
                  px: 3,
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "linear-gradient(45deg, #1565c0 30%, #2196f3 90%)",
                  },
                }}
              >
                Apply Filter
              </Button>
              <Button
                variant="outlined"
                onClick={handleResetDateFilter}
                sx={{
                  borderColor: "#1976d2",
                  color: "#1976d2",
                  borderRadius: "6px",
                  px: 3,
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#1565c0",
                    color: "#1565c0",
                    bgcolor: "rgba(25, 118, 210, 0.04)",
                  },
                }}
              >
                Reset Filter
              </Button>
            </MDBox>
          </Menu>
        </MDBox>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <PieChart
              title="Expenses by Category"
              description={`Category-wise expenses${
                startDate && endDate
                  ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(
                      endDate
                    ).toLocaleDateString()})`
                  : ""
              }`}
              data={expensesPieChartData}
              onClick={() =>
                handleChartClick(
                  filteredExpenses.reduce((acc, e) => {
                    acc[e.category] = (acc[e.category] || 0) + e.amount;
                    return acc;
                  }, {}),
                  "expenses"
                )
              }
              isActive={activeCard === "expenses"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PieChart
              title="Earnings by Category"
              description={`Category-wise earnings${
                startDate && endDate
                  ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(
                      endDate
                    ).toLocaleDateString()})`
                  : ""
              }`}
              data={earningsPieChartData}
              onClick={() =>
                handleChartClick(
                  filteredEarnings.reduce((acc, e) => {
                    acc[e.category] = (acc[e.category] || 0) + e.amount;
                    return acc;
                  }, {}),
                  "earnings"
                )
              }
              isActive={activeCard === "earnings"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MDBox
              sx={{
                backgroundColor: theme.palette.mode === "dark" ? "#1a1a1a" : "#ffffff",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                p: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h6"
                color={theme.palette.mode === "dark" ? "white" : "textPrimary"}
                fontWeight="medium"
              >
                Expenses vs Earnings
              </Typography>
              <Typography
                variant="body2"
                color={theme.palette.mode === "dark" ? "rgba(255,255,255,0.7)" : "textSecondary"}
                mb={2}
              >
                {`Comparison of expenses and earnings${
                  startDate && endDate
                    ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(
                        endDate
                      ).toLocaleDateString()})`
                    : ""
                }`}
              </Typography>
              <MDBox sx={{ flexGrow: 1, minHeight: "200px" }}>
                <Bar
                  data={expensesEarningsBarChartData}
                  options={chartOptions}
                  onClick={() => handleChartClick(null, "expensesEarnings")}
                />
              </MDBox>
              <MDBox mt={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography
                  variant="h6"
                  color={profitLoss >= 0 ? "success.main" : "error.main"}
                  fontWeight="medium"
                >
                  {profitLoss >= 0 ? "Profit" : "Loss"}: ${Math.abs(profitLoss).toFixed(2)}
                </Typography>
              </MDBox>
            </MDBox>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MDBox
              sx={{
                backgroundColor: theme.palette.mode === "dark" ? "#1a1a1a" : "#ffffff",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                p: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <MDBox display="flex" alignItems="center" justifyContent="space-between">
                <Typography
                  variant="h6"
                  color={theme.palette.mode === "dark" ? "white" : "textPrimary"}
                  fontWeight="medium"
                >
                  Financial Runway
                </Typography>
                <IconButton size="small" onClick={handleRunwaySettingsOpen}>
                  <SettingsIcon />
                </IconButton>
              </MDBox>
              <Typography
                variant="body2"
                color={theme.palette.mode === "dark" ? "rgba(255,255,255,0.7)" : "textSecondary"}
                mb={2}
              >
                {Object.keys(selectedRunwayMonths).length === 0
                  ? "Months of runway (All Months)"
                  : `Months of runway (${Object.entries(selectedRunwayMonths)
                      .filter(([_, selected]) => selected)
                      .map(([key]) => key)
                      .join(", ")})`}
              </Typography>
              <MDBox sx={{ flexGrow: 1, minHeight: "200px" }}>
                <Bar
                  data={financialRunwayBarChartData}
                  options={runwayChartOptions}
                  onClick={() => handleChartClick(null, "financialRunway")}
                />
              </MDBox>
              <MDBox mt={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography
                  variant="h6"
                  color={theme.palette.mode === "dark" ? "white" : "textPrimary"}
                  fontWeight="medium"
                >
                  Runway: {financialRunway} Months
                </Typography>
              </MDBox>
            </MDBox>
            <Menu
              id="runway-month-menu"
              anchorEl={runwayAnchorEl}
              open={Boolean(runwayAnchorEl)}
              onClose={handleRunwaySettingsClose}
              PaperProps={{
                sx: {
                  bgcolor: theme.palette.mode === "dark" ? "#2a2a2a" : "#ffffff",
                  color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                },
              }}
            >
              <MenuItem onClick={handleSelectAllMonths}>All Months</MenuItem>
              {availableYears.map((year) =>
                months.map((month, index) => (
                  <MenuItem key={`${year}-${index}`} disableGutters>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!selectedRunwayMonths[`${year}-${index}`]}
                          onChange={() =>
                            handleRunwayMonthToggle(`${year}-${index}`)
                          }
                          sx={{
                            color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                          }}
                        />
                      }
                      label={`${month} ${year}`}
                      sx={{
                        marginLeft: 1,
                        color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                      }}
                    />
                  </MenuItem>
                ))
              )}
            </Menu>
          </Grid>
        </Grid>
        <MDBox mt={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {(activeCard === "expenses" || activeCard === "earnings") &&
                selectedChartData && (
                  <DataTable
                    table={{ columns: tableColumns, rows: tableRows }}
                    showTotalEntries={false}
                    isSorted={false}
                    noEndBorder
                    entriesPerPage={false}
                    sx={{
                      "& .MuiTable-root": {
                        border: `1px solid ${theme.palette.mode === "dark" ? "#444444" : "#dddddd"}`,
                        bgcolor: theme.palette.mode === "dark" ? "#1a1a1a" : "#ffffff",
                      },
                      "& .MuiTableCell-root": {
                        padding: "10px",
                        textAlign: "center",
                        color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                        borderColor: theme.palette.mode === "dark" ? "#444444" : "#dddddd",
                      },
                      "& .MuiTableRow-root:nth-of-type(odd)": {
                        backgroundColor: theme.palette.mode === "dark" ? "#2a2a2a" : "#f9f9f9",
                      },
                    }}
                  />
                )}
            </Grid>
          </Grid>
        </MDBox>
        <MDBox mt={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {openCategory &&
                !Object.keys(selectedDetailCategories).some(
                  (key) => selectedDetailCategories[key]
                ) && (
                  <DataTable
                    table={{
                      columns: detailsColumns,
                      rows: getCategoryDetails(
                        openCategory,
                        activeCard === "expenses" ? "expense" : "earning"
                      ),
                    }}
                    showTotalEntries={false}
                    isSorted={false}
                    noEndBorder
                    entriesPerPage={false}
                    sx={{
                      "& .MuiTable-root": {
                        border: `1px solid ${theme.palette.mode === "dark" ? "#444444" : "#dddddd"}`,
                        bgcolor: theme.palette.mode === "dark" ? "#1a1a1a" : "#ffffff",
                      },
                      "& .MuiTableCell-root": {
                        padding: "10px",
                        color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                        borderColor: theme.palette.mode === "dark" ? "#444444" : "#dddddd",
                      },
                      "& .MuiTableRow-root:nth-of-type(odd)": {
                        backgroundColor: theme.palette.mode === "dark" ? "#2a2a2a" : "#f9f9f9",
                      },
                    }}
                  />
                )}
              {Object.keys(selectedDetailCategories).some(
                (key) => selectedDetailCategories[key]
              ) && (
                <DataTable
                  table={{
                    columns: detailsColumns,
                    rows: Object.entries(selectedDetailCategories)
                      .filter(([_, selected]) => selected)
                      .flatMap(([category]) =>
                        getCategoryDetails(
                          category,
                          activeCard === "expenses" ? "expense" : "earning"
                        )
                      ),
                  }}
                  showTotalEntries={false}
                  isSorted={false}
                  noEndBorder
                  entriesPerPage={false}
                  sx={{
                    "& .MuiTable-root": {
                      border: `1px solid ${theme.palette.mode === "dark" ? "#444444" : "#dddddd"}`,
                      bgcolor: theme.palette.mode === "dark" ? "#1a1a1a" : "#ffffff",
                    },
                    "& .MuiTableCell-root": {
                      padding: "10px",
                      color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                      borderColor: theme.palette.mode === "dark" ? "#444444" : "#dddddd",
                    },
                    "& .MuiTableRow-root:nth-of-type(odd)": {
                      backgroundColor: theme.palette.mode === "dark" ? "#2a2a2a" : "#f9f9f9",
                    },
                  }}
                />
              )}
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Dashboard;