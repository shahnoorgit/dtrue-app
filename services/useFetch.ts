import { useState, useEffect } from "react";

const useFetch = <T>(fetchFunction: () => Promise<T>, autoFetch = true) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const reset=()=>{
    setData(null);
    setLoading(false);
    setError(null);
  }

  // Auto-fetching on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, []); // Runs once when the component mounts

  return { data, loading, error, refetch:fetchData,reset };
};

export default useFetch;
