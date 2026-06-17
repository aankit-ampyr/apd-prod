import {Icon} from '../Icon';
import {Text} from '../Text';


interface AvatarProp {
  image?: string;
  username?: string;
  email?: string;
}
export const Avatar: React.FC<AvatarProp> = props => {
  const {email, image, username} = props;
  return (
    <div className="flex gap-2">
      <div tabIndex={0} className='size-10 rounded-full overflow-hidden outline-none focus:ring-4 focus:ring-primary-tint-1/10'>
        {image ? (
          <img src={image} className="size-full object-cover" />
        ) : (
          <div className="bg-primary-tint-2 size-full flex justify-center items-center">
            <Icon name="user" className="text-primary" />
          </div>
        )}
      </div>
      <div>
        {username && <Text className="font-InterSemiBold">{username}</Text>}
        {email && <Text className="text-text-secondary!">{email}</Text>}
      </div>
    </div>
  );
};
