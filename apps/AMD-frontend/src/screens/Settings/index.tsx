import {Benchmark, ScreenWrapper, MonthlyValues} from '@/components';
import {useToast} from '@/hooks';
import {settingsFailure, settingsSuccess} from '@/services/redux/selectors';
import {resetSettingsMessage} from '@/services/redux/slice/settingsSlice';
import {ErrorCodes, getErrorMessage, getSuccessMessage, SuccessCodes} from '@/utils';
import {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';

export function SettingsScreen() {
  // ======================
  // dispatch
  // =====================
  const dispatch = useDispatch();
  const {showToast} = useToast();

  // ======================
  // selector
  // ======================
  const success = useSelector(settingsSuccess) as SuccessCodes;
  const failure = useSelector(settingsFailure) as ErrorCodes;

  // ======================
  // side effect
  // ======================
  useEffect(() => {
    if (success) {
      // S-10042 -> benchmark config fetched successfully
      if (!['S-10042', 'S-10045'].includes(success)){
        showToast(getSuccessMessage(success), 'success');
      }
    }
    if (failure) {
      showToast(getErrorMessage(failure), 'error');
    }
    return () => {
      dispatch(resetSettingsMessage());
    };
  }, [success, failure]);

  return (
    <ScreenWrapper>
      <div className="flex flex-col gap-4">
        <Benchmark />
        <MonthlyValues />
      </div>
    </ScreenWrapper>
  );
}
