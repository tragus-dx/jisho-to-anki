// ==UserScript==
// @name         Jisho to Anki
// @version      1.2
// @description  Add words from Jisho.org to Anki with one click. Includes furigana and additional information from the site. Change deck name before use!
// @author       tragus
// @match        *jisho.org/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==


(function() {
    'use strict';

    // Function to send data to Anki using AnkiConnect API
    function addToAnki(word, meanings, addButton) {
        var meaningsText = meanings.join("<br><br>"); // Join all meanings with <br><br> between them

        GM_xmlhttpRequest({
            method: "POST",
            url: "http://localhost:8765",
            headers: {
                "Content-Type": "application/json"
            },
            data: JSON.stringify({
                action: "addNote",
                version: 6,
                params: {
                    note: {
                        //Change to your deck name
                        deckName: "Vocabulary",
                        //Choose your card type
                        modelName: "Basic",
                        fields: {
                            Front: word,
                            Back: meaningsText
                        },
                        options: {
                            //Change to 'true' to allow card duplicates
                            allowDuplicate: false
                        },
                        tags: ["Jisho"]
                    }
                }
            }),
            onload: function(response) {
                try {
                    // Attempt to parse response
                    var responseData = JSON.parse(response.responseText);
                    if (responseData.error) {
                        if (responseData.error === 'cannot create note because it is a duplicate') {
                            // Handle duplicate card error
                            addButton.style.backgroundColor = 'orange';
                            addButton.innerText = 'Warning: Card already exists';
                        } else {
                            // Handle other errors
                            throw new Error(responseData.error);
                        }
                    } else {
                        // Success
                        addButton.style.backgroundColor = '#91bdf2';
                        addButton.innerText = 'Success: Added to Anki';
                        console.log(responseData.result);
                    }
                } catch (error) {
                    console.error('An error occurred while connecting to Anki:', error);
                    // Update button appearance to indicate error
                    addButton.style.backgroundColor = 'red';
                    addButton.innerText = 'Error: Cannot connect to Anki';
                }
            },
            onerror: function(error) {
                console.error('An error occurred while connecting to Anki:', error);
                // Update button appearance to indicate error
                addButton.style.backgroundColor = 'red';
                addButton.innerText = 'Error: Cannot connect to Anki';
            }
        });
    }

    // Function to split hiragana parts between kanji characters
    function splitWord(textElement, furiganaElement) {
        var kanji = [];
        var hiragana = [];

        // Initialize an empty array to store the contents
        const textArray = [];

        // Iterate over each child node of the .text element
        textElement.childNodes.forEach(node => {
            // Check if the node is a text node or a <span> element
            if (node.nodeType === 3) {
                // If it's a text node, split its text content into individual characters
                const textContent = node.textContent.trim();
                // Iterate over each character
                for (let i = 0; i < textContent.length; i++) {
                    // Push each character to the array
                    textArray.push(' ' + textContent[i]);
                }
            } else if (node.nodeType === 1 && node.tagName.toLowerCase() === 'span') {
                // If it's a <span> element, split its text content into individual characters
                const spanContent = node.textContent.trim();
                // Iterate over each character
                for (let i = 0; i < spanContent.length; i++) {
                    // Push each character to the array
                    textArray.push(spanContent[i]);
                }
            }
        });

        // Initialize an empty array to store the contents
        const furiganaArray = [];

        // Iterate over each child node of the .furigana element
        furiganaElement.childNodes.forEach(node => {
            // Check if the node is a text node or a <span> element
            if (node.nodeType === 3) {
                // If it's a text node, push its text content to the array
                furiganaArray.push(node.textContent.trim());
            } else if (node.nodeType === 1 && node.tagName.toLowerCase() === 'span') {
                // If it's a <span> element, push its text content to the array
                furiganaArray.push(node.textContent.trim() || ''); // Push empty string if the text content is empty
            }
        });

        // Remove the first and last elements if they are empty strings
        if (furiganaArray.length > 0 && furiganaArray[0] === '') {
            furiganaArray.shift(); // Remove the first element
        }
        if (furiganaArray.length > 0 && furiganaArray[furiganaArray.length - 1] === '') {
            furiganaArray.pop(); // Remove the last element
        }


        // Map over the furiganaArray to wrap each element in square brackets
        const wrappedFuriganaArray = furiganaArray.map(element => `[${element}]`);

        const wordArray = textArray.map((textElement, index) => `${textElement}${wrappedFuriganaArray[index]}`);

        //Join all elements of the array
        var word = wordArray.join('')

        // Loop until no more occurrences of empty furigana brackets are found
        while (word.includes("[]")) {
            // Replace the first occurrence of '[]' with an empty string
            word = word.replace("[]", '');
        }
        return word;
    }



    // Add button to each word
    document.querySelectorAll(".concept_light-representation").forEach(function(wordElement) {
        var wordContainer = document.createElement("div");
        wordContainer.style.display = "inline-block";

        var textElement = wordElement.querySelector(".text");
        var furiganaElement = wordElement.querySelector(".furigana");
        var word = splitWord(textElement, furiganaElement); // Word with inserted furigana

        // Extract meanings
        var meaningsElements = wordElement.closest('.concept_light').querySelectorAll('.meaning-definition');
        var meanings = Array.from(meaningsElements).map(function(meaningElement) {
            var definitionDivider = meaningElement.querySelector(".meaning-definition-section_divider");
            var meaningText = meaningElement.querySelector(".meaning-meaning");
            var supplementalInfoElement = meaningElement.querySelector(".supplemental_info");
            var supplementalInfo = supplementalInfoElement ? '<span style="color: rgb(153, 153, 153);">' + supplementalInfoElement.textContent.trim() + '</span>' : '';

            var formattedMeaning = (definitionDivider ? definitionDivider.textContent.trim() : '') + " " + (meaningText ? meaningText.textContent.trim() : '') + " " + supplementalInfo;

            return formattedMeaning;
        });

        // Create button and add click event
        var addButton = document.createElement("button");
        addButton.textContent = "Add to Anki";
        addButton.style.width = "100px";
        addButton.style.margin = "4px 0 8px 0";
        addButton.style.padding = "2px 5px 3px 5px";
        addButton.style.fontSize = "10px";
        addButton.style.webkitFontSmoothing = "antialiased";
        addButton.style.backgroundColor = "#f56262af";
        addButton.style.borderRadius = "3px";
        addButton.style.color = "#fff";
        addButton.style.textAlign = "center";
        addButton.style.fontWeight = "bold";
        addButton.style.transition = "150ms";
        addButton.style.display = "flex";
        addButton.style.flexDirection = "row";
        addButton.style.cursor = "pointer";

        addButton.addEventListener("mouseover", function() {
            addButton.style.transition = "150ms";
            addButton.style.color = "#023e8a";
        });

        addButton.addEventListener("mouseout", function() {
            addButton.style.transition = "150ms";
            addButton.style.color = "#fff";
        });

        addButton.onclick = function() {
            addToAnki(word, meanings, addButton); // Pass addButton as an argument
        };

        // Append button to container and container to parent element
        wordContainer.appendChild(addButton);
        wordElement.parentElement.appendChild(wordContainer);
    });
})();
