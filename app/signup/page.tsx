// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";

// export default function Signup() {
//   const router = useRouter();

//   const [formData, setFormData] = useState({
//     name: "",
//     email: "",
//     password: "",
//   });

//   const handleChange = (e: any) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSubmit = async (e: any) => {
//     e.preventDefault();

//     const res = await fetch("/api/auth/signup", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(formData),
//     });

//     const data = await res.json();

//     alert(data.message);

//     if (data.success) {
//       router.push("/login");
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gray-100">
//       <form
//         onSubmit={handleSubmit}
//         className="w-full max-w-md rounded-lg bg-white p-8 shadow"
//       >
//         <h1 className="mb-6 text-center text-3xl font-bold">
//           Signup
//         </h1>

//         <input
//           name="name"
//           placeholder="Name"
//           onChange={handleChange}
//           className="mb-4 w-full rounded border p-3"
//         />

//         <input
//           name="email"
//           type="email"
//           placeholder="Email"
//           onChange={handleChange}
//           className="mb-4 w-full rounded border p-3"
//         />

//         <input
//           name="password"
//           type="password"
//           placeholder="Password"
//           onChange={handleChange}
//           className="mb-6 w-full rounded border p-3"
//         />

//         <button className="w-full rounded bg-blue-600 p-3 text-white">
//           Signup
//         </button>
//       </form>
//     </div>
//   );
// }
