// src/utils/fetchData.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "../layouts/manage-employee/firebase";

// Fetch all expenses
export const fetchExpenses = async () => {
  const expensesRef = collection(db, "expenses");
  const snapshot = await getDocs(expensesRef);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      date: data.date?.toDate ? data.date.toDate() : new Date(data.date), // Handle both Timestamp and string
      amount: data.amount,
      category: data.category,
      accountId: data.accountId,
      referenceId: data.referenceId,
    };
  });
};

// Fetch all earnings
export const fetchEarnings = async () => {
  const earningsRef = collection(db, "earnings");
  const snapshot = await getDocs(earningsRef);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      date: data.date?.toDate ? data.date.toDate() : new Date(data.date), // Handle both Timestamp and string
      amount: data.amount,
      category: data.category,
      accountId: data.accountId,
      referenceId: data.referenceId,
    };
  });
};

// Fetch expenses category-wise
export const fetchExpensesByCategory = async () => {
  const expensesRef = collection(db, "expenses");
  const snapshot = await getDocs(expensesRef);

  const expensesByCategory = {};

  snapshot.docs.forEach((doc) => {
    const category = doc.data().category;
    const amount = doc.data().amount;

    if (!expensesByCategory[category]) {
      expensesByCategory[category] = 0;
    }

    expensesByCategory[category] += amount;
  });

  return expensesByCategory;
};

// Fetch earnings category-wise
export const fetchEarningsByCategory = async () => {
  const earningsRef = collection(db, "earnings");
  const snapshot = await getDocs(earningsRef);

  const earningsByCategory = {};

  snapshot.docs.forEach((doc) => {
    const category = doc.data().category;
    const amount = doc.data().amount;

    if (!earningsByCategory[category]) {
      earningsByCategory[category] = 0;
    }

    earningsByCategory[category] += amount;
  });

  return earningsByCategory;
};
