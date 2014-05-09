# Contact Congress Form Builder

This is a jQuery plugin to build the form for contacting congress

## Usage

```
$("#form-container").contactCongress({
    bioguide_ids: ['P000197']
});

```

## Configuration

```
var options = {
  bioguide_ids: ['P000197'], // An array of Bio guides
  values: { // An object map of default values for the form
    '$MESSAGE': 'Hello Mr Politician, My name is Yoghurt!',
    '$SUBJECT': 'Introduction'
  },
  labels: true // Do you want the inputs to have labels?
};

$("#form-container").contactCongress(options);
```
