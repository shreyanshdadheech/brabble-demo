interface IPhoneFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function IPhoneFrame({ children, className = "" }: IPhoneFrameProps) {
  return (
    <div className={`h-[600px] w-[300px] ring-8 ring-black rounded-[3rem] relative overflow-hidden bg-white shadow-2xl ${className}`}>
      <div className="notch w-[40%] h-7 -top-1 rounded-b-xl bg-black absolute left-1/2 -translate-x-1/2 z-50" />
      <div className="home-button w-[40%] h-1 rounded-full bg-black absolute bottom-1 left-1/2 -translate-x-1/2" />
      {children}
    </div>
  );
}
