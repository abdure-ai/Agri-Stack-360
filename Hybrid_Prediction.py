import numpy as np
from keras.models import load_model
from keras.preprocessing import image
from PIL import Image
from sklearn.preprocessing import StandardScaler

# Load the saved model
model = load_model('New_model_with_dropout_256_20_32.keras')

# Load a sample image and preprocess it
sample_img_path = 'C:/Users/G15/Desktop/Experiment Result/Hybrid_TV_4L_20EP_32_0.5Dropout.png'  # Replace 'sample_image.jpg' with the path to your sample image
sample_img = Image.open(sample_img_path)
sample_img = sample_img.resize((80, 80))  # Resize image to match model input size
sample_img_array = np.array(sample_img) / 255.0  # Normalize pixel values to [0, 1]
sample_img_array = np.expand_dims(sample_img_array, axis=0)  # Add batch dimension
			
#1421	18	85	11

A=2500
T= 18
H= 85
P= 200
# Load and preprocess sample environmental data
sample_environmental_data = np.array([[A,T,H,P]])  # Replace '...' with your sample environmental data
scaler = StandardScaler()
sample_environmental_data_scaled = scaler.fit_transform(sample_environmental_data)

# Perform prediction
predictions = model.predict([sample_img_array, sample_environmental_data_scaled])

# Get class labels
class_labels = ['Brown Rust', 'Healthy Wheat', 'Invalid', 'Pow Mil', 'Septoria', 'Yellow Rust']  # Replace with your actual class labels

# Print prediction percentage for each class
for i, label in enumerate(class_labels):
    prediction_percentage = predictions[0][i] * 100
    print(f"Predicted percentage for class {label}: {prediction_percentage:.2f}%")
