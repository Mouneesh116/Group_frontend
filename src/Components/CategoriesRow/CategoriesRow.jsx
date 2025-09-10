import React from 'react';
import './CategoriesRow.css';

const cart1 = "https://mouneesh-group.s3.us-east-1.amazonaws.com/Images/Fashion.jpg";
const cart2 = "https://mouneesh-group.s3.us-east-1.amazonaws.com/Images/electronics.jpg";
const cart3 = "https://mouneesh-group.s3.us-east-1.amazonaws.com/Images/shoes.jpg";
const cart4 = "https://mouneesh-group.s3.us-east-1.amazonaws.com/Images/Beauty.jpg";
const cart5 = "https://mouneesh-group.s3.us-east-1.amazonaws.com/Images/sports.jpg";
const cart6 = "https://mouneesh-group.s3.us-east-1.amazonaws.com/Images/decorate.jpg";
import { Link } from 'react-router-dom';
 
const CategoriesRow = () => {
  const categories = [
    { img: cart1, label: "Fashion" },
    { img: cart2, label: "Electronics" },
    { img: cart3, label: "Shoes" },
    { img: cart4, label: "Beauty" },
    { img: cart5, label: "Sports" },
    { img: cart6, label: "Home Decor" },
  ];
 
  return (
    <div className="categories-row-container">
      <h2 className="categories-row-title">Shop By Categories</h2>
      <div className="categories-row-list">
        {categories.map((category, index) => (
          <div
            className="categories-row-item"
            key={index}
            style={{ backgroundImage: `url(${category.img})` }}
          >
            <Link to={`/categories/${category.label.toLowerCase()}`} className="categories-row-link">
              <div className="categories-row-label-overlay">
                <p>{category.label}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
 
export default CategoriesRow;
