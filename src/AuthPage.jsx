import { useParams, useNavigate } from 'react-router-dom';
import Auth from './components/Auth';

const AuthPage = ({ setUser }) => {
    const { mode } = useParams();
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/');
    };

    const handleSuccess = (user) => {
        if (setUser) setUser(user);

        if (mode === 'patient') {
            navigate('/profile-selection');
        } else {
            navigate('/');
        }
    };

    return (
        <Auth
            mode={mode}
            onBack={handleBack}
            onSuccess={handleSuccess}
        />
    );
};

export default AuthPage;
