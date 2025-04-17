import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Platform,
  Text,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import icon from "@/assets/images/enhanced-icon-quality.png";
import wordToPdf from "@/assets/images/wordtopdf.png";
import excelToPdf from "@/assets/images/exceltopdf.jpeg";
import pdfToWord from "@/assets/images/pdftoword.png";
import { CircleCheckBig, CircleX, Info } from "lucide-react-native";

// Updated conversion options with description & image
const conversionOptions = [
  {
    key: "word",
    label: "Word → PDF",
    description: "Turn your .docx documents into shareable PDF files.",
    illustration: wordToPdf,
    endpoint: "https://api.cloudmersive.com/convert/docx/to/pdf",
    fileType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bgColor: "blue",
    outputFileName: "converted.pdf",
  },
  {
    key: "excel",
    label: "Excel → PDF",
    description: "Convert your spreadsheets (.xlsx/.xls) into PDFs.",
    illustration: excelToPdf,
    endpoint: "https://api.cloudmersive.com/convert/xlsx/to/pdf",
    fileType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bgColor: "green",
    outputFileName: "converted.pdf",
  },
  {
    key: "pdf2word",
    label: "PDF → Word",
    description: "Transform PDF files back into editable .docx format.",
    illustration: pdfToWord,
    endpoint: "https://api.cloudmersive.com/convert/pdf/to/docx",
    fileType: "application/pdf",
    bgColor: "red",
    outputFileName: "converted.docx",
  },
];

const bgColorMap = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
};

type Option = {
  label: string;
  endpoint: string;
  fileType: string;
  outputFileName: string;
  bgColor: "blue" | "green" | "red";
  illustration: ImageSourcePropType;
};

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [converted, setConverted] = useState<"SUCCESS" | "FAILED" | "PENDING">(
    "PENDING"
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Function to pick a file, convert it, and store it in Downloads (Android)
  const handleConversion = async (option: Option) => {
    if (!option) {
      Alert.alert("Please choose a conversion type first.");
      return;
    }
    try {
      setConverted("PENDING");
      setSuccessMessage("");
      setErrorMessage("");
      // Use Expo's DocumentPicker to show the system file picker.
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      // Check if the user cancelled the picker.
      if (result.canceled) {
        return;
      }
      // Use the first asset returned.
      const file = result.assets[0];
      const extension = option.outputFileName.split(".")[1];
      option.outputFileName = file.name.split(".")[0] + "." + extension;

      if (extension === "xls") {
        option.endpoint = "https://api.cloudmersive.com/convert/xls/to/pdf";
      }

      // Build the FormData for the API request.
      const formData = new FormData();
      const fileToUpload = {
        uri: file.uri,
        type: file.mimeType || option.fileType,
        name: file.name,
      };
      // Append the file (using "as any" to bypass TS type issues in Expo)
      formData.append("inputFile", fileToUpload as any);

      setIsLoading(true);

      // Call Cloudmersive conversion API.
      const response = await fetch(option.endpoint, {
        method: "POST",
        headers: {
          Apikey: process.env.EXPO_PUBLIC_CLOUDMERSIVE_API_KEY!,
          // Do not set 'Content-Type' header – fetch will handle the boundary.
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Conversion failed with status ${response.status}`);
      }

      // Retrieve the response as a blob.
      const blob = await response.blob();

      // Convert the blob to base64 using a FileReader.
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === "string") {
          const base64data = reader.result.split(",")[1]; // remove "data:*/*;base64," prefix

          // Write the file to a temporary path in the cache directory.
          const tempFilePath =
            FileSystem.cacheDirectory + option.outputFileName;
          await FileSystem.writeAsStringAsync(tempFilePath, base64data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (Platform.OS === "android") {
            // Request permission to access media library.
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Permission not granted to access media library.");
              return;
            }

            // Create a media asset from the temporary file.
            const asset = await MediaLibrary.createAssetAsync(tempFilePath);

            // Try to get the "Converter Docs" album; if it doesn't exist, create it.
            let album = await MediaLibrary.getAlbumAsync("Converter Docs");
            if (!album) {
              album = await MediaLibrary.createAlbumAsync(
                "Converter Docs",
                asset,
                false
              );
            } else {
              await MediaLibrary.addAssetsToAlbumAsync(
                [asset],
                album.id,
                false
              );
            }

            setSuccessMessage(
              "File saved to 'Converter Docs' under Pictures folder."
            );
            setConverted("SUCCESS");
          } else {
            setSuccessMessage(
              `File saved to temporary folder: ${tempFilePath}`
            );
            setConverted("SUCCESS");
          }
        } else {
          Alert.alert("Error", "Could not convert file to base64.");
          setErrorMessage("Error: Could not convert file to base64.");
          setConverted("FAILED");
        }
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      setErrorMessage(
        `Error: ${err.message || "An unexpected error occurred."}`
      );
      setConverted("FAILED");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="w-full h-screen bg-sky-50">
      <Image
        source={icon as ImageSourcePropType}
        className="absolute w-full h-72 z-0 "
        resizeMode="cover"
      />
    <ScrollView className="flex-1  p-4" showsVerticalScrollIndicator={false}>
      <Text className="text-3xl font-bold mt-32 text-center p-2">File Converter</Text>
      <Text className="text-center flex gap-14 mb-6 items-center">
        <Text className="flex gap-2 justify-center items-center">
          <Text className="text-center">
            <Info color={"gray"} size={13} className=" " />{" "}
          </Text>
          <Text className="font-bold ">Max file size:</Text>
          <Text className="text-red-500/70"> (3.5 MB)</Text>
        </Text>
      </Text>

      {converted === "SUCCESS" ? (
        <Text className="text-center mb-6 p-2 gap-2 flex justify-center">
          <CircleCheckBig color={"green"} />
          <Text className="text-base text-green-400 font-bold">
            {successMessage}
          </Text>
        </Text>
      ) : (
        converted === "FAILED" && (
          <Text className="text-center mb-6 p-2 flex gap-2 justify-center">
            <CircleX color={"red"} />
            <Text className="text-base text-red-400 font-bold ">
              {errorMessage}
            </Text>
          </Text>
        )
      )}
      {isLoading && (
        <ActivityIndicator
          color="#fff"
          size={"large"}
          className="mb-6 text-green-500"
        />
      )}

      {conversionOptions.map((opt) => (
        <View
          key={opt.key}
          className="bg-white rounded-xl shadow-lg overflow-hidden mb-6"
        >
          {/* Illustration */}
          <Image
            source={opt.illustration as ImageSourcePropType}
            className="w-full h-40"
            resizeMode="cover"
          />

          {/* Content */}
          <View className="p-4">
            <Text className="text-xl font-semibold mb-2">{opt.label}</Text>
            <Text className="text-gray-600 mb-4">{opt.description}</Text>

            {/* Convert Button */}
            <TouchableOpacity
              onPress={() => handleConversion(opt as Option)}
              disabled={isLoading}
              className={`
                w-full py-3 rounded-lg 
                ${bgColorMap[(opt as Option).bgColor]} 
                ${isLoading ? "opacity-50" : "opacity-100"}
              `}
            >
              <Text className="text-center text-white font-medium">
                Convert Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
    </View>
  );
}
