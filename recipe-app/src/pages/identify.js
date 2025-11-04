import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import '../css/identify.css';


function Identify() {
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone();

  const files = acceptedFiles.map(file => (
    <li key={file.path}>
      {file.path} - {file.size} bytes
    </li>
  ));
  // function uploadImage() {
  //   const imageUpload = document.getElementById('dropzone');
  //   const files = imageUpload.files;
  //   const messageBox = document.getElementById('message');

  //   if (!files.length) {
  //     messageBox.innerHTML = 'Please select an image';
  //     return;
  //   }

  //   const formData = new FormData();
  //   formData.append('image', files[0]);

  //   fetch('server/endpoint', {
  //     method: 'POST',
  //     body: formData
  //   })
  //   .then(response => {
  //     if (!response.ok) {
  //       throw new Error('HTTP error ' + response.status);
  //     }
  //     return response.json();
  //   })
  //   .then(data => {
  //     if (data.success) {
  //       messageBox.innerHTML = 'Image Uploaded';
  //       messageBox.style.color = 'green';
  //       console.log('Server response: ', data);
  //     } else {
  //       messageBox.innerHTML = 'Error: ' + data.error;
  //       messageBox.style.color = 'red';
  //     }
  //   })
  //   .catch(error => {
  //     messageBox.innerHTML = 'Error during upload: ' + error.message;
  //     messageBox.style.color = 'red';
  //     console.error('Upload Error: ', error);
  //   });

  return (
    // <main className="tm-page">
    //   <h1>Identify Recipes</h1>
    //   <p>Upload an Image to identify whats in the recipe</p>
    //   {/* <input type="file" id="imageUpload" accept="image/*" /> */}
    //   <input type="dropzone" id="dropzone" accept="image/*"/>
    //   <button onClick={uploadImage()}>Identify Recipe</button>
    //   <div id="message"></div>
    // </main>
    <section className='container'>
      <div {...getRootProps({className: 'dropzone'})}>
        <input {...getInputProps()} />
        <p>Drag 'n' drop some files here, or click to select files</p>
        <em>(Only *.jpeg and *.png images will be accepted)</em>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </section>
  );
}

export default Identify