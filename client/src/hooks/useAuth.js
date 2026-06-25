import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadProfile, setInitialLoadingDone } from '../redux/slices/authSlice';
import storage from '../utils/storage';

/**
 * Auto-login hook. Checks for stored token and loads profile.
 */
const useAuth = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, initialLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await storage.getToken();
      if (token) {
        dispatch(loadProfile());
      } else {
        dispatch(setInitialLoadingDone());
      }
    };
    checkAuth();
  }, [dispatch]);

  return { isAuthenticated, user, initialLoading };
};

export default useAuth;
